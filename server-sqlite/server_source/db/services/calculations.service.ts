import { Decimal } from "decimal.js";
import { TransactionService } from "./transaction.service.ts";
import { CurrencyCalculator, CurrencyService } from "./currency.service.ts";
import { CurrencyCache } from "../caches/currencyListCache.cache.ts";
import { UserNotFoundError, UserService } from "./user.service.ts";
import { panic, unwrap } from "../../std_errors/monadError.ts";
import { ArgsComparisonError, ConstantComparisonError } from "../../std_errors/argsErrors.ts";
import { isInt } from "class-validator";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.ts";
import { Database } from "../db.ts";
import { QUERY_IGNORE } from "../../symbols.ts";
import { CurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.ts";
import { FragmentRaw } from "../entities/fragment.entity.ts";
import { ContainerNotFoundError } from "./container.service.ts";
import { LinearInterpolatorVirtual } from "../../calculations/linearInterpolatorVirtual.ts";
import { DecimalAdditionMapReducer, reverseMap } from "../servicesUtils.ts";
import { UserCache } from '../caches/user.cache.ts';

/** An object that represents a query of a time range. */
export type TimeRangeQuery =
{
    mode: "AT_OR_AFTER" | "AT_OR_BEFORE",
    epoch: number
};
export type UserBalanceHistoryMap = { [epoch: string]: { [currencyId: string]: Decimal } };
export type UserBalanceHistoryResults =
{
    historyMap: UserBalanceHistoryMap,
    currenciesEarliestPresentEpoch: { [currencyId: string]: number }
};

export type ContainerNetworthTimelineEntry =
{
    txn:
    {
        id: string,
        creationDate: number,
        title: string,
        fragments: FragmentRaw[],
    },
    containerBalance: { [currId: string]: Decimal },
    containerWorth: string
};

export type ContainerBalanceTimelineEntry =
{
    txn:
    {
        id: string,
        creationDate: number,
        title: string,
        fragments: FragmentRaw[],
    },
    containerBalance: { [currId: string]: Decimal },
};

export class CalculationsService
{
    /**
     * Given a list of containers, return each containers' balance history.
     * Notice that the number of txns in each container will always equal to the number of returned datums for that container.
     * In other words, the datums returned are NOT evenly spaced.
     * If you need an evenly-spaced result, use a `LinearStepper` to space the series.
     */
    public static async getContainersBalanceHistory
    (
        userId: string,
        containerIds: string[],
        skipContainerCheck = false
    ): Promise<{ [contId: string]: ContainerBalanceTimelineEntry[] } | ContainerNotFoundError>
    {
        const contRepo = Database.getContainerRepository!();
        const txnRepo = Database.getTransactionRepository()!;

        if (!skipContainerCheck)
            for (const cId of containerIds)
                if (! await contRepo?.getContainer(userId, cId, QUERY_IGNORE))
                    return new ContainerNotFoundError(cId, userId);

        // TODO: Move container filter to SQL, should be faster with external RDBMS
        /** All txns related to the given containers. Sorted: From earliest to latest txns */
        const containerTxns = (await txnRepo.getTransactions(userId))
        .rangeItems
        .filter(x => x.fragments.some(f =>
        {
            if (f.fromContainerId && containerIds.includes(f.fromContainerId)) return true;
            if (f.toContainerId && containerIds.includes(f.toContainerId)) return true;
            return false;
        }))
        .reverse();

        const output: { [containerId: string]: ContainerBalanceTimelineEntry[] } = {};

        for (const containerId of containerIds)
        {
            const entries: ContainerBalanceTimelineEntry[] = [];
            const balancesReducer = new DecimalAdditionMapReducer<string>({});

            for (const txn of containerTxns)
            {
                let relatedFragmentsCount = 0;

                // Reduce fragments balances to reducer
                for (const fragment of txn.fragments)
                {
                    const fromRelated = fragment.fromCurrencyId && fragment.fromContainerId === containerId;
                    const toRelated = fragment.toCurrencyId && fragment.toContainerId === containerId;

                    if (fromRelated) await balancesReducer.reduce(fragment.fromCurrencyId!, new Decimal(fragment.fromAmount!).neg());
                    if (toRelated) await balancesReducer.reduce(fragment.toCurrencyId!, new Decimal(fragment.toAmount!));

                    if (fromRelated || toRelated) relatedFragmentsCount++;
                }

                if (relatedFragmentsCount === 0) continue;

                entries.push(
                {
                    txn:
                    {
                        creationDate: txn.creationDate,
                        fragments: txn.fragments,
                        id: txn.id!,
                        title: txn.title,
                    },
                    containerBalance: { ...balancesReducer.currentValue }
                });
            }

            output[containerId] = entries;
        }

        return output;
    }

    /**
     * Given a list of containers, return each containers' balance and networth history.
     * Notice that the number of txns in each container will always equal to the number of returned datums for that container.
     * In other words, the datums returned are NOT evenly spaced.
     * If you need an evenly-spaced result, use a `LinearStepper` to space the series.
     // TODO: Refactor this using the above function
     */
    public static async getContainersWorthHistory
    (
        userId: string,
        containerIds: string[],
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null
    ): Promise<{ [containerId: string]: ContainerNetworthTimelineEntry[] } | ContainerNotFoundError>
    {
        const balanceHistories = await this.getContainersBalanceHistory(
            userId,
            containerIds,
            false
        );

        if (balanceHistories instanceof ContainerNotFoundError) return balanceHistories;

        const networthHistory: { [containerId: string]: ContainerNetworthTimelineEntry[] } = {};
        for (const [containerId, balanceHistory] of Object.entries(balanceHistories))
        {
            networthHistory[containerId] = [];
            for (const historyEntry of balanceHistory)
            {
                // TODO: See if we can use interpolator for performance reason?
                networthHistory[containerId].push(
                {
                    containerBalance: historyEntry.containerBalance,
                    txn: historyEntry.txn,
                    containerWorth: (await CurrencyService.getWorthOfBalances
                    (
                        userId,
                        historyEntry.txn.creationDate,
                        historyEntry.containerBalance,
                        currencyRateDatumsCache,
                        currencyToBaseRateCache,
                        currencyCache,
                        userCache
                    )).totalWorth.toString()
                });
            }
        }

        return networthHistory;
    }

    /**
     * Get the total expenses and incomes given a list of time ranges.
     */
    public static async getExpensesAndIncomesOfTimeRanges
    (
        userId: string,
        queryLines: { [queryName: string]: TimeRangeQuery },
        nowEpoch: number,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null,
        config: { countExcludedTxns: boolean } | null = null
    )
    {
        if (!isInt(nowEpoch)) throw panic(`nowEpoch must be an integer.`);

        /** To count transactions marked as excluded from incomes / expenses. */
        const countExcludedTxns = config === null ? false : config.countExcludedTxns;
        const txnRepo = Database.getTransactionRepository()!;
        const queryNamesAndQuery = Object.entries(queryLines);

        // Only fetch all transactions after the earliest requested epoch to save bandwidth.
        const earliestEpochRequested: number = (() =>
        {
            let earliestEpochRequested = queryNamesAndQuery[0][1].epoch;
            if (Object.values(queryLines).some(q => q.mode === 'AT_OR_BEFORE')) return 0;
            for (const queryLine of Object.values(queryLines))
            {
                if (queryLine.mode === 'AT_OR_AFTER' && queryLine.epoch <= earliestEpochRequested)
                    earliestEpochRequested = queryLine.epoch;
            }
            return earliestEpochRequested;
        })();

        const allTxns = (await txnRepo.getTransactions(userId, {
            startDate: earliestEpochRequested
        })).rangeItems;

        const totalCutoffs = (() =>
        {
            const output: { [cutoffName: string]: { expenses: Decimal, incomes: Decimal } } = {};
            for (const key of Object.keys(queryLines))
                output[key] = { expenses: new Decimal('0'), incomes: new Decimal("0") };
            return output;
        })();

        for (const txn of allTxns)
        {
            if (!countExcludedTxns && txn.excludedFromIncomesExpenses)
                continue;

            const { increaseInValue } =
                unwrap(await TransactionService.getTxnIncreaseInValue
                (
                    userId,
                    txn,
                    currencyRateDatumsCache,
                    currencyToBaseRateCache,
                    currencyCache,
                    userCache
                ));

            const isValueDecreased = increaseInValue.lessThanOrEqualTo(new Decimal('0'));
            for (const queryQueryPair of queryNamesAndQuery)
            {
                const [queryName, query] = queryQueryPair;
                const isTxnWithinQueryRange = (() =>
                {
                    if (query.mode === 'AT_OR_AFTER' && txn.creationDate >= query.epoch) return true;
                    if (query.mode === 'AT_OR_BEFORE' && txn.creationDate <= query.epoch) return true;
                    return false;
                })();
                if (!isTxnWithinQueryRange) continue;

                if (isValueDecreased)
                {
                    const delta = increaseInValue.neg();
                    totalCutoffs[queryName].expenses = totalCutoffs[queryName].expenses.add(delta);
                }
                else { totalCutoffs[queryName].incomes = totalCutoffs[queryName].incomes.add(increaseInValue); }
            }

        }

        return totalCutoffs;
    }

    /**
     * Get the balance history of a user across all containers.
     * The resulting map will have exactly ``division`` count of entires.
     * The first entry will be the startDate, and the last entry will be the endDate.
     */
    public static async getUserBalanceHistory(userId: string, startDate: number, endDate: number, division: number):
        Promise<UserBalanceHistoryResults | ArgsComparisonError<number> | ConstantComparisonError<number>>
    {
        if (startDate >= endDate)
            return new ArgsComparisonError("startDate", startDate, "endDate", endDate, "LARGER_THAN_OR_EQUAL");

        if (division <= 1)
            return new ConstantComparisonError("division", division, 1, "LARGER_THAN_OR_EQUAL")

        /** Sorted: From earliest to latest txns */
        const usrTxns = (await Database.getTransactionRepository()!.getTransactions(userId)).rangeItems.reverse();

        const output: UserBalanceHistoryResults =
        {
            currenciesEarliestPresentEpoch: {},
            historyMap: {}
        };
        const balancesReducer = new DecimalAdditionMapReducer<string>({});
        const divisionEpoch = (endDate - startDate) / (division - 1);
        const appendCurrencyToEpoch = (cId: string, epoch: number) =>
        {
            if (output.currenciesEarliestPresentEpoch[cId]) return;
            output.currenciesEarliestPresentEpoch[cId] = epoch;
        };

        // Step with the given division epoch and get each epoch's balance
        await (async () =>
        {
            let currentTxnIndex = 0;
            for (let datumIndex = 0; datumIndex < division; datumIndex++)
            {
                const currentEpoch = Math.round(startDate + divisionEpoch * datumIndex);

                while (currentTxnIndex < usrTxns.length && usrTxns[currentTxnIndex].creationDate <= currentEpoch)
                {
                    const txn = usrTxns[currentTxnIndex];

                    for (const fragment of txn.fragments)
                    {
                        if (fragment.fromAmount && fragment.fromCurrencyId)
                        {
                            await balancesReducer.reduce(fragment.fromCurrencyId, new Decimal(fragment.fromAmount).neg());
                            appendCurrencyToEpoch(fragment.fromCurrencyId, txn.creationDate);
                        }
                        if (fragment.toAmount && fragment.toCurrencyId)
                        {
                            await balancesReducer.reduce(fragment.toCurrencyId, new Decimal(fragment.toAmount));
                            appendCurrencyToEpoch(fragment.toCurrencyId, txn.creationDate);
                        }
                    }

                    output.historyMap[currentEpoch.toString()] = { ...balancesReducer.currentValue };
                    currentTxnIndex++;
                }

                if (!(currentEpoch.toString() in output.historyMap))
                    output.historyMap[currentEpoch.toString()] = { ...balancesReducer.currentValue };
            }

        })();

        return output;
    }

    public static async getUserNetworthHistory
    (
        userId: string,
        startDate: number,
        endDate: number,
        division: number,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        cache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null
    ): Promise<{[epoch: string]:string} | UserNotFoundError | ArgsComparisonError<number> | ConstantComparisonError<number>>
    {
        type cInterpolatorMap = { [currencyId: string]: LinearInterpolatorVirtual };

        const currRepo = Database.getCurrencyRepository()!;

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId, userCache);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const balanceHistory = await CalculationsService.getUserBalanceHistory(userId, startDate, endDate, division);
        if (balanceHistory instanceof ArgsComparisonError) return balanceHistory;
        if (balanceHistory instanceof ConstantComparisonError) return balanceHistory;
        const currenciesInterpolators: cInterpolatorMap = {};
        const getInterpolatorForCurrency = async (cId: string) =>
        {
            const interpolator = unwrap(await CurrencyCalculator.getCurrencyToBaseRateInterpolator
            (
                userId,
                cId,
                currencyRateDatumsCache,
                cache,
                currencyCache,
                userCache,
                startDate,
                endDate,
            ));
            return interpolator;
        };

        /** After obtaining the balance history, map each entry in the history to the actual value at that epoch. */
        const balanceToNetworthEntries: [ string, string ][] = [];
        for (const epoch of Object.keys(balanceHistory.historyMap))
        {
            let valueOfAllCurrenciesSum = new Decimal(0);
            for (const currencyID of Object.keys(balanceHistory.historyMap[epoch]))
            {
                const currencyObject = await currRepo.findCurrencyByIdNameTickerOne(
                    userId,
                    currencyID,
                    QUERY_IGNORE,
                    QUERY_IGNORE,
                    currencyCache
                );

                let currencyRateToBase = await (async () =>
                {
                    // Check if this is available in cache first
                    const cacheResult = cache?.queryCurrencyToBaseRate(userId, currencyID, parseInt(epoch));
                    if (cacheResult !== null && cacheResult !== undefined) return cacheResult;

                    // If not available, load the entire interpolator and use the interpolator output.
                    if (!currenciesInterpolators[currencyID])
                        currenciesInterpolators[currencyID] = await getInterpolatorForCurrency(currencyID);
                    return await currenciesInterpolators[currencyID].getValue(new Decimal(epoch));
                })();

                // Happens when the rate is unavailable at the given epoch (first rate is after the given epoch)
                // when this happen, use base rate instead.
                if (currencyRateToBase === undefined)
                {
                    currencyRateToBase = unwrap(await CurrencyCalculator.currencyToBaseRate
                    (
                        userId,
                        currencyObject!,
                        parseInt(epoch),
                        currencyRateDatumsCache,
                        cache,
                        currencyCache,
                        userCache
                    ));
                }
                const currencyValue = currencyRateToBase.mul(balanceHistory.historyMap[epoch][currencyID]);
                valueOfAllCurrenciesSum = valueOfAllCurrenciesSum.add(currencyValue);
            }
            balanceToNetworthEntries.push([epoch, valueOfAllCurrenciesSum.toString()]);
        }

        const balanceToNetworthHistory = reverseMap(balanceToNetworthEntries);

        return balanceToNetworthHistory;
    }
}