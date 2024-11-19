import { Decimal } from "decimal.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { TransactionService } from "./transaction.service.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { Transaction } from "../entities/transaction.entity.js";
import { DecimalAdditionMapReducer, nameof, ServiceUtils } from "../servicesUtils.js";
import { LinearInterpolator } from "../../calculations/linearInterpolator.js";
import { CurrencyCalculator, CurrencyService } from "./currency.service.js";
import { GlobalCurrencyCache } from "../caches/currencyListCache.cache.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { unwrap } from "../../std_errors/monadError.js";
import { ArgsComparisonError, ConstantComparisonError } from "../../std_errors/argsErrors.js";

export type UserBalanceHistoryMap = { [epoch: string]: { [currencyId: string]: Decimal } };
export type UserBalanceHistoryResults =
{
    historyMap: UserBalanceHistoryMap,
    currenciesEarliestPresentEpoch: { [currencyId: string]: number }
};

export class CalculationsService
{
    public static async getUserExpensesAndIncomes30d(userId: string)
    {
        const allTxns = await TransactionRepository.getInstance().createQueryBuilder(`txn`)
        .select(
        [
            `txn.${nameof<Transaction>('ownerId')}`,
            `txn.${nameof<Transaction>('creationDate')}`,
            `txn.${nameof<Transaction>('toAmount')}`,
            `txn.${nameof<Transaction>('toCurrencyId')}`,
            `txn.${nameof<Transaction>('fromAmount')}`,
            `txn.${nameof<Transaction>('fromCurrencyId')}`
        ])
        .where(`txn.${nameof<Transaction>('ownerId')} = :ownerId`, { ownerId: userId })
        .andWhere(`${nameof<Transaction>('creationDate')} >= :startDate`, { startDate: Date.now() - 2.592e+9 })
        .getMany() as SQLitePrimitiveOnly<Transaction>[];

        const now = new Date().getTime();
        const total = { expenses: new Decimal('0'), incomes: new Decimal("0") };
        const total30d = { expenses: new Decimal('0'), incomes: new Decimal("0") };
        const total7d = { expenses: new Decimal('0'), incomes: new Decimal("0") };

        let currencyBaseValueMapping = { };
        for (let txn of allTxns)
        {
            const { increaseInValue, currencyBaseValMapping: newCurrencyBaseValueMapping } =
                unwrap(await TransactionService.getTxnIncreaseInValue
                (
                    userId,
                    txn,
                    currencyBaseValueMapping
                ));

            currencyBaseValueMapping = newCurrencyBaseValueMapping;
            const isValueDecreased = increaseInValue.lessThanOrEqualTo(new Decimal('0'));
            const txnAgeMs = now - txn.creationDate;
            const txnIs30d = txnAgeMs <= 2.592e+9;
            const txnIs7d = txnAgeMs <= 6.048e+8;

            if (isValueDecreased)
            {
                const delta = increaseInValue.neg();
                total.expenses = total.expenses.add(delta);
                if (txnIs30d) total30d.expenses = total30d.expenses.add(delta);
                if (txnIs7d) total7d.expenses = total7d.expenses.add(delta);
            }
            else
            {
                total.incomes = total.incomes.add(increaseInValue);
                if (txnIs30d) total30d.incomes = total30d.incomes.add(increaseInValue);
                if (txnIs7d) total7d.incomes = total7d.incomes.add(increaseInValue);
            }
        }
        return {
            total: total,
            total30d: total30d,
            total7d: total7d
        };
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
        const usrTxns = (await TransactionService.getTransactions(userId)).rangeItems.reverse();

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
                    if (txn.fromAmount && txn.fromCurrencyId)
                    {
                        await balancesReducer.reduce(txn.fromCurrencyId, new Decimal(txn.fromAmount).neg());
                        appendCurrencyToEpoch(txn.fromCurrencyId, txn.creationDate);
                    }
                    if (txn.toAmount && txn.toCurrencyId)
                    {
                        await balancesReducer.reduce(txn.toCurrencyId, new Decimal(txn.toAmount));
                        appendCurrencyToEpoch(txn.toCurrencyId, txn.creationDate);
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
        division: number
    ): Promise<{[epoch: string]:string} | UserNotFoundError | ArgsComparisonError<number> | ConstantComparisonError<number>>
    {
        type cInterpolatorMap = { [currencyId: string]: LinearInterpolator };

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const balanceHistory = await CalculationsService.getUserBalanceHistory(userId, startDate, endDate, division);
        if (balanceHistory instanceof ArgsComparisonError) return balanceHistory;
        if (balanceHistory instanceof ConstantComparisonError) return balanceHistory;

        const currenciesIdsInvolved = Object.keys(balanceHistory.currenciesEarliestPresentEpoch);

        const currenciesInterpolators: cInterpolatorMap = await (async () =>
        {
            const output: cInterpolatorMap = {};
            for (const cId of currenciesIdsInvolved)
            {
                const interpolator = unwrap(await CurrencyCalculator.getCurrencyToBaseRateInterpolator
                (
                    userId,
                    cId,
                    new Date(startDate),
                    new Date(endDate)
                ));
                output[cId] = interpolator;
            }
            return output;
        })();

        /** After obtaining the balance history, map each entry in the history to the actual value at that epoch. */
        const balanceToNetworthEntries: [ string, string ][] = [];
        for (const epoch of Object.keys(balanceHistory.historyMap))
        {
            let valueOfAllCurrenciesSum = new Decimal(0);
            for (const currencyID of Object.keys(balanceHistory.historyMap[epoch]))
            {
                const currencyObject = await (async () =>
                {
                    const cacheResult = GlobalCurrencyCache.queryCurrency(userId, currencyID);
                    if (cacheResult) return cacheResult;
                    const fetchedResult = unwrap(await CurrencyService.getCurrencyByIdWithoutCache(userId, currencyID));
                    GlobalCurrencyCache.cacheCurrency(userId, currencyID, fetchedResult!);
                    return fetchedResult;
                })();

                let currencyRateToBase = currenciesInterpolators[currencyID].getValue(new Decimal(epoch));

                // Happens when the rate is unavailable at the given epoch (first rate is after the given epoch)
                // when this happen, use base rate instead.
                if (currencyRateToBase === undefined)
                {
                    currencyRateToBase = unwrap(await CurrencyCalculator.currencyToBaseRate
                    (
                        userId,
                        currencyObject!,
                        new Date(parseInt(epoch))
                    ));
                }
                const currencyValue = currencyRateToBase.mul(balanceHistory.historyMap[epoch][currencyID]);
                valueOfAllCurrenciesSum = valueOfAllCurrenciesSum.add(currencyValue);
            }
            balanceToNetworthEntries.push([epoch, valueOfAllCurrenciesSum.toString()]);
        }

        const balanceToNetworthHistory = ServiceUtils.reverseMap(balanceToNetworthEntries);

        return balanceToNetworthHistory;
    }
}