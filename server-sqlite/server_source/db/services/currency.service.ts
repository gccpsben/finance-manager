import { Decimal } from "decimal.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { Currency } from "../entities/currency.entity.js";
import { FindOptionsWhere } from "typeorm";
import { CurrencyRateDatumRepository } from "../repositories/currencyRateDatum.repository.js";
import { LinearInterpolator } from "../../calculations/linearInterpolator.js";
import { IdBound, SQLitePrimitiveOnly } from "../../index.d.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { GlobalCurrencyRateDatumsCache } from '../caches/currencyRateDatumsCache.cache.js';
import { GlobalCurrencyCache } from "../caches/currencyListCache.cache.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { MonadError, panic, unwrap } from "../../std_errors/monadError.js";
import { CurrencyToBaseRateCache, GlobalCurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";

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
        cache: CurrencyToBaseRateCache | undefined = GlobalCurrencyToBaseRateCache,
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const fromRate = unwrap(await this.currencyToBaseRate(ownerId, from, undefined, cache));
        const toRate = unwrap(await this.currencyToBaseRate(ownerId, to, undefined, cache));
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
        date: Date = new Date(),
        cache: CurrencyToBaseRateCache | undefined = GlobalCurrencyToBaseRateCache,
    ): Promise<Decimal | UserNotFoundError>
    {
        if (from.isBase) return new Decimal(`1`);

        const cacheResult = cache?.queryCurrencyToBaseRate(ownerId, from.id, date.getTime());
        if (cacheResult !== null && cacheResult !== undefined)
            return cacheResult;

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const cacheResultIfPossible = (result: Decimal) => {
            if (cache)
                cache.cacheCurrencyToBase(ownerId, from.id, date.getTime(), result);
        };

        const getCurrById = async (id: string) =>
        {
            const cacheResult = GlobalCurrencyCache.queryCurrency(ownerId, id);
            if (cacheResult) return cacheResult as (IdBound<typeof fetchedResult>);
            const fetchedResult = await CurrencyService.getCurrencyByIdWithoutCache(ownerId, id);
            GlobalCurrencyCache.cacheCurrency(ownerId, id, unwrap(fetchedResult)!);
            return fetchedResult as IdBound<typeof fetchedResult>;
        };

        const nearestTwoDatums = await CurrencyRateDatumRepository.getInstance().findNearestTwoDatum
        (
            ownerId,
            from.id,
            date
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
                cache
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
                new Date(d1.date),
                cache
            )!);
            return unwrap(datumAmount.mul(datumUnitToBaseRate));
        }

        else // if (nearestTwoDatums.length === 2)
        {
            const isDateBeforeD1D2 = date.getTime() < d1.date && date.getTime() < d2.date; // ....^..|....|........
            const isDateAfterD1D2 = date.getTime() > d1.date && date.getTime() > d2.date;  // .......|....|...^....
            const D1Currency = unwrap(await getCurrById(d1.refAmountCurrencyId))!;
            const D2Currency = d1.refAmountCurrencyId === d2.refAmountCurrencyId ? D1Currency : unwrap(await getCurrById(d2.refAmountCurrencyId))!;
            const D1CurrBaseRate = unwrap(await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                D1Currency,
                new Date(d1.date),
                cache
            )!);
            const D2CurrBaseRate = unwrap(await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                D2Currency,
                new Date(d2.date),
                cache
            ))!;

            let valLeft = new Decimal(d1.amount).mul(D1CurrBaseRate);
            let valRight = new Decimal(d2.amount).mul(D2CurrBaseRate);
            if (isDateBeforeD1D2 || isDateAfterD1D2 || valLeft === valRight)
            {
                if (cache) cacheResultIfPossible(valLeft);
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
            ).getValue(new Decimal(date.getTime()));

            if (cache) cacheResultIfPossible(midPt!);

            return midPt!;
        }
    }


    // TODO: Make startDate and endDate responsive to cache
    public static async getCurrencyToBaseRateInterpolator
    (
        userId:string,
        currencyId: string,
        startDate?: Date,
        endDate?: Date,
        cache: CurrencyToBaseRateCache | undefined = GlobalCurrencyToBaseRateCache,
    ): Promise<LinearInterpolator | UserNotFoundError>
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const datums = await (async () =>
        {
            const cacheResult = GlobalCurrencyRateDatumsCache.queryRateDatums(userId, currencyId);
            if (cacheResult) return cacheResult;
            const fetchedResult = await CurrencyRateDatumRepository.getInstance().getCurrencyDatums(userId, currencyId);
            GlobalCurrencyRateDatumsCache.cacheRateDatums(userId, currencyId, fetchedResult);
            return fetchedResult;
        })();

        const getCurrById = async (id: string) =>
        {
            const cacheResult = GlobalCurrencyCache.queryCurrency(userId, id);
            if (cacheResult) return cacheResult;
            const fetchedResult = await CurrencyService.getCurrencyByIdWithoutCache(userId, id);
            GlobalCurrencyCache.cacheCurrency(userId, id, unwrap(fetchedResult)!);
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
                            new Date(datum.date),
                            cache
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
    public static async tryGetUserBaseCurrency(userId: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: userId ?? null }});
        if (!user) return new UserNotFoundError(userId);

        return await CurrencyRepository.getInstance().findOne(
        {
            where:
            {
                owner: { id: userId },
                isBase: true,
            },
            relations: { owner: true, fallbackRateCurrency: true }
        });
    }

    public static async getUserAllCurrencies(userId: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: userId ?? null }});
        if (!user) return new UserNotFoundError(userId);

        const results = await CurrencyRepository.getInstance()
        .createQueryBuilder(`currency`)
        .where(`currency.${nameof<Currency>('ownerId')} = :ownerId`, { ownerId: userId })
        .getMany();

        return results;
    }

    public static async getManyCurrencies
    (
        ownerId: string,
        query:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            name?: string | undefined, id?: string | undefined
        }
    ): Promise<{ totalCount: number, rangeItems: IdBound<Currency>[] } | UserNotFoundError>
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId ?? null }});
        if (!user) return new UserNotFoundError(ownerId);

        let dbQuery = CurrencyRepository.getInstance()
        .createQueryBuilder(`curr`)
        .where(`${nameof<Currency>('ownerId')} = :ownerId`, { ownerId: ownerId ?? null });

        if (query.name) dbQuery = dbQuery.andWhere("name = :name", { name: query.name ?? null })
        if (query.id) dbQuery = dbQuery.andWhere("id = :id", { id: query.id ?? null })
        dbQuery = ServiceUtils.paginateQuery(dbQuery, query);

        const queryResult = await dbQuery.getManyAndCount();
        if (queryResult[0].some(x => !x.id)) throw panic(`Currencies queried from database contain falsy IDs`);

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0] as (typeof queryResult[0][0] & { id: string })[]
        }
    }

    public static async getCurrencyByIdWithoutCache(userId:string, currencyId: string): Promise<
        null |
        UserNotFoundError |
        IdBound<Currency>
    >
    {
        return await this.getCurrencyWithoutCache(userId, { id: currencyId ?? null });
    }

    public static async getCurrencyWithoutCache(userId: string, where: Omit<FindOptionsWhere<Currency>, 'owner'>): Promise<
        null |
        UserNotFoundError |
        IdBound<Currency>
    >
    {
        const user = await UserRepository.getInstance().findOne({where: { id: userId ?? null }});
        if (!user) return new UserNotFoundError(userId);

        const result = await CurrencyRepository.getInstance().findOne(
        {
            where: { ...where, owner: { id: userId } },
            relations: { owner: true, fallbackRateCurrency: true }
        });

        if (!result) return null;
        if (!result.id) throw panic(`Currency queried from database contains falsy IDs`);

        return result as IdBound<typeof result>;
    }

    public static async createCurrency(userId: string,
        name: string,
        amount: Decimal | undefined,
        refCurrencyId: string | undefined,
        ticker: string
    ): Promise<IdBound<Currency> | CurrencyNotFoundError | CurrencyNameTakenError | CurrencyTickerTakenError | UserNotFoundError>
    {
        // Check refCurrencyId exists if refCurrencyId is defined.
        if (refCurrencyId && !(await CurrencyRepository.getInstance().isCurrencyByIdExists(refCurrencyId, userId)))
            return new CurrencyNotFoundError(refCurrencyId, userId);

        if (!!(await CurrencyRepository.getInstance().isCurrencyByNameExists(name, userId)))
            return new CurrencyNameTakenError(name, userId);

        if (!!(await CurrencyRepository.getInstance().isCurrencyByTickerExists(ticker, userId)))
            return new CurrencyTickerTakenError(ticker, userId);

        const user = await UserRepository.getInstance().findOne({where:{id: userId}});
        if (user === null)
            return new UserNotFoundError(userId);

        const newCurrency = CurrencyRepository.getInstance().create(
        {
            name,
            owner: user,
            ticker: ticker
        });

        if (refCurrencyId) newCurrency.fallbackRateCurrency = await CurrencyRepository.getInstance().findOne({where:{id: refCurrencyId}});
        newCurrency.isBase = (amount === undefined && refCurrencyId === undefined);
        newCurrency.fallbackRateAmount = amount == undefined ? undefined : amount.toFixed();

        const savedNewCurrency = await CurrencyRepository.getInstance().save(newCurrency);
        if (!savedNewCurrency.id) throw panic(`Currencies saved into database contain falsy IDs.`);

        return savedNewCurrency as IdBound<typeof savedNewCurrency>;
    }

    public static async rateHydrateCurrency
    (
        userId:string,
        currencies: IdBound<SQLitePrimitiveOnly<Currency>>[],
        date: number | undefined = undefined,
        cache: CurrencyToBaseRateCache | undefined = GlobalCurrencyToBaseRateCache,
    )
    {
        type outputType = { currency: IdBound<SQLitePrimitiveOnly<Currency>>, rateToBase: string };
        const getRateToBase = async (c: IdBound<SQLitePrimitiveOnly<Currency>>) =>
        (
            await CurrencyCalculator.currencyToBaseRate
            (
                userId,
                c,
                new Date(date ?? 0),
                cache
            )
        ).toString();

        const output: outputType[] = [];
        for (const currency of currencies)
        {
            output.push({
                currency: currency,
                rateToBase: await getRateToBase(currency)
            });
        }
        return output;
    }
}