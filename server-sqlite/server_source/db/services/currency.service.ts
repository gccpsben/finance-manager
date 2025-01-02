import { Decimal } from "decimal.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { Currency } from "../entities/currency.entity.js";
import { LinearInterpolator } from "../../calculations/linearInterpolator.js";
import { IdBound } from "../../index.d.js";
import { nameof } from "../servicesUtils.js";
import { CurrencyRateDatumsCache } from '../caches/currencyRateDatumsCache.cache.js';
import { CurrencyCache } from "../caches/currencyListCache.cache.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { MonadError, unwrap } from "../../std_errors/monadError.js";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { Database } from "../db.js";
import { QUERY_IGNORE } from "../../symbols.js";

export class CurrencyRefCurrencyIdAmountTupleError extends MonadError<typeof CurrencyRefCurrencyIdAmountTupleError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public amount: string | undefined;
    public currencyId: string | undefined;
    public userId: string;

    constructor(currencyId: string | undefined, userId: string, amount: string | undefined)
    {
        const nameofC = nameof<Currency>;
        super(CurrencyRefCurrencyIdAmountTupleError.ERROR_SYMBOL, `If ${nameofC('fallbackRateCurrency')} is given, ${nameofC('fallbackRateAmount')} must also be specified.`);
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
        ownerId:string,
        from: Currency & { id: string }, to: Currency & { id: string },
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyListCache: CurrencyCache | null
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const fromRate = unwrap(await this.currencyToBaseRate(ownerId, from, undefined, currencyRateDatumsCache, currencyToBaseRateCache, currencyListCache));
        const toRate = unwrap(await this.currencyToBaseRate(ownerId, to, undefined, currencyRateDatumsCache, currencyToBaseRateCache, currencyListCache));
        return fromRate.dividedBy(toRate);
    }

    /**
     * Get the rate of `<target_currency>` to `<base_currency>` at the given date using the rates of the currency stored in database.
     * #### *if the rates at the given datetime are not available in the database, will use the fallback rate (`Currency.rateToBase`) instead.
    */
    public static async currencyToBaseRate
    (
        ownerId: string,
        from:
        {
            id:string,
            isBase: boolean,
            fallbackRateAmount?: string | null | undefined,
            fallbackRateCurrencyId?: string | null | undefined,
        },
        date: number = Date.now(),
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null
    ): Promise<Decimal | UserNotFoundError>
    {
        if (from.isBase) return new Decimal(`1`);

        const currRepo = Database.getCurrencyRepository()!;

        const cacheResult = currencyToBaseRateCache?.queryCurrencyToBaseRate(ownerId, from.id, date);
        if (cacheResult !== null && cacheResult !== undefined)
            return cacheResult;

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const cacheResultIfPossible = (result: Decimal) => {
            if (currencyToBaseRateCache)
                currencyToBaseRateCache.cacheCurrencyToBase(ownerId, from.id, date, result);
        };

        const getCurrById = async (id: string) =>
        {
            const cacheResult = currencyCache?.queryCurrency(ownerId, id);
            if (cacheResult) return cacheResult as (IdBound<typeof fetchedResult>);
            const fetchedResult = await currRepo.findCurrencyByIdNameTickerOne(ownerId, id, QUERY_IGNORE, QUERY_IGNORE, currencyCache);
            return fetchedResult as IdBound<typeof fetchedResult>;
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
                currencyCache
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
                currencyCache
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
                currencyCache
            )!);
            const D2CurrBaseRate = unwrap(await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                D2Currency,
                d2.date,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache
            ))!;

            let valLeft = new Decimal(d1.amount).mul(D1CurrBaseRate);
            let valRight = new Decimal(d2.amount).mul(D2CurrBaseRate);
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


    // TODO: Make startDate and endDate responsive to cache
    public static async getCurrencyToBaseRateInterpolator
    (
        userId:string,
        currencyId: string,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        startDate?: number | undefined,
        endDate?: number | undefined,
    ): Promise<LinearInterpolator | UserNotFoundError>
    {
        const currRepo = await Database.getCurrencyRepository()!;

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const datums = await Database.getCurrencyRateDatumRepository()!.getCurrencyDatums(
            userId,
            currencyId,
            undefined,
            undefined,
            currencyRateDatumsCache
        )

        const getCurrById = async (id: string) =>
        {
            const cacheResult = currencyCache?.queryCurrency(userId, id);
            if (cacheResult) return cacheResult;
            const fetchedResult = await currRepo.findCurrencyByIdNameTickerOne(userId, id, QUERY_IGNORE, QUERY_IGNORE, currencyCache);
            return fetchedResult;
        };

        const entries: { key:Decimal, value: Decimal }[] = await (async () =>
        {
            const output: { key:Decimal, value: Decimal }[] = [];
            for (const datum of datums)
            {
                const datumUnitCurrency = unwrap(await getCurrById(datum.refAmountCurrencyId))!;

                output.push(
                {
                    key: new Decimal(datum.date),
                    value: new Decimal(datum.amount).mul
                    (
                        unwrap(await CurrencyCalculator.currencyToBaseRate
                        (
                            userId,
                            datumUnitCurrency,
                            datum.date,
                            currencyRateDatumsCache,
                            currencyToBaseRateCache,
                            currencyCache
                        ))
                    )
                });
            }
            return output;
        })();
        return LinearInterpolator.fromEntries(entries);
    }
};

export class CurrencyService
{
    public static async createCurrency
    (
        userId: string,
        name: string,
        amount: Decimal | undefined,
        refCurrencyId: string | undefined,
        ticker: string,
        currencyCache: CurrencyCache | null
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
            if (!!currencyWithName) return new CurrencyNameTakenError(name, userId);
        }

        // Check for repeated ticker
        {
            const currencyWithTicker = await cRepo.findCurrencyByIdNameTickerOne(userId, QUERY_IGNORE, QUERY_IGNORE, ticker,currencyCache);
            if (!!currencyWithTicker) return new CurrencyTickerTakenError(ticker, userId);
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
            currencyCache
        );

        return savedNewCurrency;
    }

    public static async rateHydrateCurrency
    (
        userId:string,
        currencies:
        {
            id: string;
            isBase: boolean;
            fallbackRateAmount?: string | null | undefined;
            fallbackRateCurrencyId?: string | null | undefined;
        }[],
        date: number | undefined = undefined,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null
    )
    {
        type outputType =
        {
            currency: {
                id: string;
                isBase: boolean;
                fallbackRateAmount?: string | null | undefined;
                fallbackRateCurrencyId?: string | null | undefined;
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
                    currencyCache
                )).toString()
            });
        }
        return output;
    }

    public static async getWorthOfBalances
    (
        userId:string,
        date: number,
        balances: { [currId: string]: Decimal },
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyListCache: CurrencyCache | null
    )
    {
        const currRepo = Database.getCurrencyRepository()!;
        const getRate = async (currencyId: string) =>
        {
            let currencyRate = await (async () =>
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
                        currencyListCache
                    )
                )[0].rateToBase;

                if (currencyToBaseRateCache)
                    currencyToBaseRateCache.cacheCurrencyToBase(userId, currencyRefetched!.id, date, new Decimal(rate));

                return rate;
            })();

            return currencyRate;
        };

        let currenciesRate:{ [currId: string]: string; } = {};
        let output: Decimal = new Decimal("0");
        for (const [currId, amount] of Object.entries(balances))
        {
            if (!currenciesRate[currId])
                currenciesRate[currId] = await getRate(currId);

            let currencyWorth = new Decimal((await getRate(currId))).mul(amount);
            output = output.add(currencyWorth);
        }

        return {
            rates: currenciesRate,
            totalWorth: output
        }
    }
}