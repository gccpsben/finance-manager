import { Decimal } from "decimal.js";
import { CurrencyRepository } from "../repositories/currency.repository.ts";
import { UserRepository } from "../repositories/user.repository.ts";
import { LinearInterpolator } from "../../calculations/linearInterpolator.ts";
import { CurrencyRateDatumsCache } from '../caches/currencyRateDatumsCache.cache.ts';
import { CurrencyCache } from "../caches/currencyListCache.cache.ts";
import { UserNotFoundError, UserService } from "./user.service.ts";
import { MonadError, unwrap } from "../../std_errors/monadError.ts";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.ts";
import { Database } from "../db.ts";
import { QUERY_IGNORE } from "../../symbols.ts";
import { LinearInterpolatorVirtual } from "../../calculations/linearInterpolatorVirtual.ts";
import { reverseMap } from "../servicesUtils.ts";
import { UserCache } from '../caches/user.cache.ts';
import { keyNameOfCurrency } from "../entities/currency.entity.ts";
import { UUID } from "node:crypto";
import { QueryRunner } from 'typeorm';

export class CurrencyRefCurrencyIdAmountTupleError extends MonadError<typeof CurrencyRefCurrencyIdAmountTupleError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public amount: string | undefined;
    public currencyId: string | undefined;
    public userId: string;

    constructor(currencyId: string | undefined, userId: string, amount: string | undefined)
    {
        super(CurrencyRefCurrencyIdAmountTupleError.ERROR_SYMBOL, `If ${keyNameOfCurrency('fallbackRateCurrency')} is given, ${keyNameOfCurrency('fallbackRateAmount')} must also be specified.`);
        this.name = this.constructor.name;
        this.currencyId = currencyId;
        this.userId = userId;
        this.amount = amount;
    }
}

export class CurrencyNotFoundError extends MonadError<typeof CurrencyNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public currencyId: string;
    public userId: string;

    constructor(currencyId: string, userId: string)
    {
        super(CurrencyNotFoundError.ERROR_SYMBOL, `Cannot find the given currency with id = ${currencyId}`);
        this.name = this.constructor.name;
        this.currencyId = currencyId;
        this.userId = userId;
    }
}
export class CurrencyNameTakenError extends MonadError<typeof CurrencyNameTakenError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public currencyName: string;
    public userId: string;

    constructor(currencyName: string, userId: string)
    {
        super(CurrencyNameTakenError.ERROR_SYMBOL, `Currency with name ${currencyName} is already taken.`);
        this.name = this.constructor.name;
        this.currencyName = currencyName;
        this.userId = userId;
    }
}

export class CurrencyTickerTakenError extends MonadError<typeof CurrencyTickerTakenError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public currencyTicker: string;
    public userId: string;

    constructor(currencyTicker: string, userId: string)
    {
        super(CurrencyTickerTakenError.ERROR_SYMBOL, `Currency with ticker ${currencyTicker} is already taken.`);
        this.name = this.constructor.name;
        this.currencyTicker = currencyTicker;
        this.userId = userId;
    }
}

export class CurrencyCalculator
{
    public static async currencyToCurrencyRate
    (
        ownerId:UUID,
        from: {
            id: UUID;
            isBase: boolean;
            fallbackRateAmount?: string | null | undefined;
            fallbackRateCurrencyId?: UUID | null | undefined;
        },
        to: {
            id: UUID;
            isBase: boolean;
            fallbackRateAmount?: string | null | undefined;
            fallbackRateCurrencyId?: UUID | null | undefined;
        },
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyListCache: CurrencyCache | null,
        userCache: UserCache | null
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId, userCache);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const fromRate = unwrap(await this.currencyToBaseRate(ownerId, from, undefined, currencyRateDatumsCache, currencyToBaseRateCache, currencyListCache, userCache));
        const toRate = unwrap(await this.currencyToBaseRate(ownerId, to, undefined, currencyRateDatumsCache, currencyToBaseRateCache, currencyListCache, userCache));
        return fromRate.dividedBy(toRate);
    }

    /**
     * Get the rate of `<target_currency>` to `<base_currency>` at the given date using the rates of the currency stored in database.
     * #### *if the rates at the given datetime are not available in the database, will use the fallback rate (`Currency.rateToBase`) instead.
    */
    public static async currencyToBaseRate
    (
        ownerId: UUID,
        from:
        {
            id:UUID,
            isBase: boolean,
            fallbackRateAmount?: string | null | undefined,
            fallbackRateCurrencyId?: UUID | null | undefined,
        },
        date: number = Date.now(),
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null
    ): Promise<Decimal | UserNotFoundError>
    {
        if (from.isBase) return new Decimal(`1`);

        const currRepo = Database.getCurrencyRepository()!;

        const cacheResult = currencyToBaseRateCache?.queryCurrencyToBaseRate(ownerId, from.id, date);
        if (cacheResult !== null && cacheResult !== undefined)
            return cacheResult;

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId, userCache);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const cacheResultIfPossible = (result: Decimal) => {
            if (currencyToBaseRateCache)
                currencyToBaseRateCache.cacheCurrencyToBase(ownerId, from.id, date, result);
        };

        const getCurrById = async (id: UUID) =>
        {
            const cacheResult = currencyCache?.queryCurrency(ownerId, id);
            if (cacheResult) return cacheResult as typeof fetchedResult;
            const fetchedResult = await currRepo.findCurrencyByIdNameTickerOne(ownerId, id, QUERY_IGNORE, QUERY_IGNORE, currencyCache);
            return fetchedResult as typeof fetchedResult;
        };

        const nearestTwoDatums = await Database.getCurrencyRateDatumRepository()!.findNearestTwoDatum
        (
            ownerId,
            from.id,
            date,
            currencyRateDatumsCache,
        );
        const d1 = nearestTwoDatums[0]; const d2 = nearestTwoDatums[1];

        if (nearestTwoDatums.length === 0)
        {
            const currencyBaseAmount = new Decimal(from.fallbackRateAmount ?? "0");
            const currencyBaseAmountUnitToBaseRate = await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                unwrap(await getCurrById(from.fallbackRateCurrencyId!))!,
                date,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache,
                userCache
            )!;
            return currencyBaseAmount.mul(unwrap(currencyBaseAmountUnitToBaseRate));
        }

        if (nearestTwoDatums.length === 1)
        {
            const datumAmount = new Decimal(d1.amount);
            const datumUnitToBaseRate = unwrap(await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                unwrap(await getCurrById(d1.refAmountCurrencyId))!,
                d1.date,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache,
                userCache
            )!);
            return unwrap(datumAmount.mul(datumUnitToBaseRate));
        }

        else // if (nearestTwoDatums.length === 2)
        {
            const isDateBeforeD1D2 = date < d1.date && date < d2.date; // ....^..|....|........
            const isDateAfterD1D2 = date > d1.date && date > d2.date;  // .......|....|...^....
            const D1Currency = unwrap(await getCurrById(d1.refAmountCurrencyId))!;
            const D2Currency = d1.refAmountCurrencyId === d2.refAmountCurrencyId ? D1Currency : unwrap(await getCurrById(d2.refAmountCurrencyId))!;
            const D1CurrBaseRate = unwrap(await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                D1Currency,
                d1.date,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache,
                userCache
            )!);
            const D2CurrBaseRate = unwrap(await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                D2Currency,
                d2.date,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache,
                userCache
            ))!;

            const valLeft = new Decimal(d1.amount).mul(D1CurrBaseRate);
            const valRight = new Decimal(d2.amount).mul(D2CurrBaseRate);
            if (isDateBeforeD1D2 || isDateAfterD1D2 || valLeft === valRight)
            {
                if (currencyToBaseRateCache) cacheResultIfPossible(valLeft);
                return valLeft;
            }

            const midPt = LinearInterpolator.fromEntries
            (
                [
                    { key: d1.date, value: valLeft },
                    { key: d2.date, value: valRight },
                ],
                item => new Decimal(item.key),
                item => item.value
            ).getValue(new Decimal(date));

            if (currencyToBaseRateCache) cacheResultIfPossible(midPt!);

            return midPt!;
        }
    }


    public static async getCurrencyToBaseRateInterpolator
    (
        userId:UUID,
        currencyId: UUID,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null,
        startDate?: number | undefined,
        endDate?: number | undefined,
    ): Promise<LinearInterpolatorVirtual | UserNotFoundError>
    {
        const currRepo = Database.getCurrencyRepository()!;

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId, userCache);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const currencyRateDatums = await Database.getCurrencyRateDatumRepository()!.getCurrencyDatums(
            userId,
            currencyId,
            startDate,
            endDate, // TODO: See if any edge-case will occur here (datum slightly out of range)
            currencyRateDatumsCache
        );

        const dateToDatumTable = reverseMap(currencyRateDatums.map(x => ([`${x.date}`, x])));

        const output = await LinearInterpolatorVirtual.fromEntries
        (
            currencyRateDatums,
            d => new Decimal(d.date),
            async datumKey =>
            {
                const datum = dateToDatumTable[datumKey.toString()];

                const datumUnitCurrency = (await currRepo.findCurrencyByIdNameTickerOne(
                    userId,
                    datum.refAmountCurrencyId,
                    QUERY_IGNORE,
                    QUERY_IGNORE,
                    currencyCache
                ))!;


                const currencyRateAtDate = unwrap(await CurrencyCalculator.currencyToBaseRate
                (
                    userId,
                    datumUnitCurrency,
                    datum.date,
                    currencyRateDatumsCache,
                    currencyToBaseRateCache,
                    currencyCache,
                    userCache
                ));

                return new Decimal(datum.amount).mul(currencyRateAtDate);
            }
        );

        return output;
    }
};

export class CurrencyService
{
    public static async createCurrency
    (
        userId: UUID,
        name: string,
        amount: Decimal | undefined,
        refCurrencyId: UUID | undefined,
        ticker: string,
        queryRunner: QueryRunner,
        currencyCache: CurrencyCache | null,
    ): Promise<
        ReturnType<CurrencyRepository['saveNewCurrency']> |
        CurrencyNotFoundError |
        CurrencyNameTakenError |
        CurrencyTickerTakenError |
        UserNotFoundError |
        CurrencyRefCurrencyIdAmountTupleError
    >
    {
        const cRepo = Database.getCurrencyRepository()!;

        // Check refCurrencyId exists if refCurrencyId is defined.
        refCurrencyCheck:
        {
            if (refCurrencyId === undefined) break refCurrencyCheck;
            const refCurrency = await cRepo.findCurrencyByIdNameTickerOne(userId,refCurrencyId,QUERY_IGNORE,QUERY_IGNORE,currencyCache);
            if (!refCurrency) return new CurrencyNotFoundError(refCurrencyId, userId);
        }

        // Check for repeated currency name.
        {
            const currencyWithName = await cRepo.findCurrencyByIdNameTickerOne(userId,QUERY_IGNORE,name,QUERY_IGNORE,currencyCache);
            if (currencyWithName !== null) return new CurrencyNameTakenError(name, userId);
        }

        // Check for repeated ticker
        {
            const currencyWithTicker = await cRepo.findCurrencyByIdNameTickerOne(userId, QUERY_IGNORE, QUERY_IGNORE, ticker,currencyCache);
            if (currencyWithTicker !== null) return new CurrencyTickerTakenError(ticker, userId);
        }

        if ((amount !== undefined && refCurrencyId === undefined) || (amount === undefined && refCurrencyId !== undefined))
            return new CurrencyRefCurrencyIdAmountTupleError(refCurrencyId, userId, amount?.toString());

        const user = await UserRepository.getInstance().findOne({where:{id: userId}});
        if (user === null)
            return new UserNotFoundError(userId);

        const savedNewCurrency = Database.getCurrencyRepository()!.saveNewCurrency
        (
            {
                name: name,
                isBase: (amount === undefined && refCurrencyId === undefined),
                ownerId: user.id,
                ticker: ticker,
                fallbackRateAmount: amount == undefined ? undefined : amount.toFixed(),
                fallbackRateCurrencyId: refCurrencyId,
                lastRateCronUpdateTime: undefined
            },
            queryRunner,
            currencyCache
        );

        return savedNewCurrency;
    }

    public static async rateHydrateCurrency
    (
        userId:UUID,
        currencies:
        {
            id: UUID;
            isBase: boolean;
            fallbackRateAmount?: string | null | undefined;
            fallbackRateCurrencyId?: UUID | null | undefined;
        }[],
        date: number | undefined = undefined,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null
    )
    {
        type outputType =
        {
            currency: {
                id: UUID;
                isBase: boolean;
                fallbackRateAmount?: string | null | undefined;
                fallbackRateCurrencyId?: UUID | null | undefined;
            }, rateToBase: string
        };

        const output: outputType[] = [];
        for (const currency of currencies)
        {
            output.push({
                currency: currency,
                rateToBase: (await CurrencyCalculator.currencyToBaseRate
                (
                    userId,
                    currency,
                    date ?? 0,
                    currencyRateDatumsCache,
                    currencyToBaseRateCache,
                    currencyCache,
                    userCache
                )).toString()
            });
        }
        return output;
    }

    public static async getWorthOfBalances
    (
        userId:UUID,
        date: number,
        balances: { [currId: UUID]: Decimal },
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyListCache: CurrencyCache | null,
        userCache: UserCache | null
    )
    {
        const currRepo = Database.getCurrencyRepository()!;
        const getRate = async (currencyId: UUID) =>
        {
            const currencyRate = await (async () =>
            {
                // Try getting the currency rate to base at txn's epoch from cache first.
                const amountToBaseValueCacheResult = currencyToBaseRateCache?.queryCurrencyToBaseRate(userId, currencyId, date);
                if (amountToBaseValueCacheResult) return amountToBaseValueCacheResult.toString();

                // If not available, compute the rate uncached. And finally save the result into cache.
                const currencyRefetched = await currRepo.findCurrencyByIdNameTickerOne
                (
                    userId,
                    currencyId,
                    QUERY_IGNORE,
                    QUERY_IGNORE,
                    currencyListCache
                );
                const rate =
                (
                    await CurrencyService.rateHydrateCurrency
                    (
                        userId,
                        [currencyRefetched!],
                        date,
                        currencyRateDatumsCache,
                        currencyToBaseRateCache,
                        currencyListCache,
                        userCache
                    )
                )[0].rateToBase;

                if (currencyToBaseRateCache)
                    currencyToBaseRateCache.cacheCurrencyToBase(userId, currencyRefetched!.id, date, new Decimal(rate));

                return rate;
            })();

            return currencyRate;
        };

        const currenciesRate:{ [currId: UUID]: string; } = {};
        let output: Decimal = new Decimal("0");
        for (const [currId, amount] of Object.entries(balances))
        {
            if (!currenciesRate[currId as UUID])
                currenciesRate[currId as UUID] = await getRate(currId as UUID);

            const currencyWorth = new Decimal((await getRate(currId as UUID))).mul(amount);
            output = output.add(currencyWorth);
        }

        return {
            rates: currenciesRate,
            totalWorth: output
        }
    }
}