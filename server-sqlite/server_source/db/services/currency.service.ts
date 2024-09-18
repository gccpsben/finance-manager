import { Decimal } from "decimal.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import createHttpError from "http-errors";
import { Currency, RateHydratedPrimitiveCurrency } from "../entities/currency.entity.js";
import { FindOptionsWhere } from "typeorm";
import { CurrencyRateDatumRepository } from "../repositories/currencyRateDatum.repository.js";
import { LinearInterpolator } from "../../calculations/linearInterpolator.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { CurrencyListCache } from "../caches/currencyListCache.cache.js";

export class CurrencyCalculator
{
    public static async currencyToCurrencyRate(ownerId:string, from: Currency, to: Currency)
    {
        const fromRate = await this.currencyToBaseRate(ownerId, from);
        const toRate = await this.currencyToBaseRate(ownerId, to);
        return fromRate.dividedBy(toRate);
    }

    /** 
     * Get the rate of `<target_currency>` to `<base_currency>` at the given date using the rates of the currency stored in database. 
     * #### *if the rates at the given datetime are not available in the database, will use the fallback rate (`Currency.rateToBase`) instead.
    */
    public static async currencyToBaseRate
    (
        ownerId: string, 
        from: SQLitePrimitiveOnly<Currency>, 
        date: Date = new Date(),
        cache: CurrencyListCache | undefined = undefined
    ): Promise<Decimal>
    { 
        if (cache === undefined) cache = new CurrencyListCache(ownerId);
        if (from.isBase) return new Decimal(`1`);
    
        const getCurrById = async (id: string) => 
        {
            // Find the requested currency in `knownCurrencies` first.
            const potentialCacheHit = cache?.getCurrenciesList()?.find(c => c.ownerId === ownerId && c.id === id);
            if (potentialCacheHit) return potentialCacheHit;

            if (cache) // if cache object exists but still cannot find the currency, we want to fetch all currencies and cache it
            {
                await cache.ensureCurrenciesList();
                return cache.getCurrenciesList().find(c => c.id === id);
            }
            else // if cache object doesnt exist, we just want to fetch the bare min
            {
                return CurrencyService.getCurrencyById(ownerId, id);
            }
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
            const currencyBaseAmount = new Decimal(from.fallbackRateAmount);
            const currencyBaseAmountUnitToBaseRate = await CurrencyCalculator.currencyToBaseRate
            (
                ownerId, 
                await getCurrById(from.fallbackRateCurrencyId), 
                date,
                cache
            )!;
            return currencyBaseAmount.mul(currencyBaseAmountUnitToBaseRate);
        }

        if (nearestTwoDatums.length === 1) 
        {
            const datumAmount = new Decimal(d1.amount);
            const datumUnitToBaseRate = await CurrencyCalculator.currencyToBaseRate
            (
                ownerId, 
                await getCurrById(d1.refAmountCurrencyId), 
                new Date(d1.date),
                cache
            )!;
            return datumAmount.mul(datumUnitToBaseRate);
        }

        else // if (nearestTwoDatums.length === 2)
        {
            const isDateBeforeD1D2 = date.getTime() < d1.date && date.getTime() < d2.date; // ....^..|....|........
            const isDateAfterD1D2 = date.getTime() > d1.date && date.getTime() > d2.date;  // .......|....|...^....
            const D1Currency = await getCurrById(d1.refAmountCurrencyId);
            const D2Currency = d1.refAmountCurrencyId === d2.refAmountCurrencyId ? D1Currency : await getCurrById(d2.refAmountCurrencyId);
            const D1CurrBaseRate = await CurrencyCalculator.currencyToBaseRate
            (
                ownerId,
                D1Currency, 
                new Date(d1.date),
                cache
            )!;
            const D2CurrBaseRate = await CurrencyCalculator.currencyToBaseRate
            (
                ownerId, 
                D2Currency, 
                new Date(d2.date),
                cache
            )!;
    
            let valLeft = new Decimal(d1.amount).mul(D1CurrBaseRate);
            let valRight = new Decimal(d2.amount).mul(D2CurrBaseRate);
            if (isDateBeforeD1D2 || isDateAfterD1D2) return valLeft;
            if (valLeft === valRight) return valLeft;
    
            const midPt = LinearInterpolator.fromEntries
            (
                [
                    { key: d1.date, value: valLeft },
                    { key: d2.date, value: valRight },
                ],
                item => new Decimal(item.key),
                item => item.value
            ).getValue(new Decimal(date.getTime()));
            return midPt;
        }
    }

    public static async getCurrencyToBaseRateInterpolator
    (
        userId:string, 
        currencyId: string,
        startDate?: Date,
        endDate?: Date,
        cache: CurrencyListCache | undefined = undefined
    ): Promise<LinearInterpolator>
    {   
        if (cache === undefined) cache = new CurrencyListCache(userId);
        await cache.ensureCurrenciesList();

        const datums = await CurrencyRateDatumRepository.getInstance().getCurrencyDatums(userId, currencyId, startDate, endDate);
        const entries: { key:Decimal, value: Decimal }[] = await (async () => 
        {
            const output: { key:Decimal, value: Decimal }[] = [];
            for (const datum of datums) 
            {
                const datumUnitCurrency = cache.getCurrenciesList().find(c => c.id === datum.refAmountCurrencyId);
                output.push(
                {
                    key: new Decimal(datum.date),
                    value: new Decimal(datum.amount).mul(await CurrencyCalculator.currencyToBaseRate(userId, datumUnitCurrency, new Date(datum.date), cache))
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
        if (!user) throw createHttpError(404, `Cannot find user with id '${userId}'`);
        
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
        if (!user) throw createHttpError(404, `Cannot find user with id '${userId}'`);

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
    ): Promise<{ totalCount: number, rangeItems: SQLitePrimitiveOnly<Currency>[] }>
    {
        let dbQuery = CurrencyRepository.getInstance()
        .createQueryBuilder(`curr`)
        .where(`${nameof<Currency>('ownerId')} = :ownerId`, { ownerId: ownerId ?? null });

        if (query.name) dbQuery = dbQuery.andWhere("name = :name", { name: query.name ?? null })
        if (query.id) dbQuery = dbQuery.andWhere("id = :id", { id: query.id ?? null })
        dbQuery = ServiceUtils.paginateQuery(dbQuery, query);

        const queryResult = await dbQuery.getManyAndCount();
        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0]
        }
    }

    public static async getCurrencyById(userId:string, currencyId: string)
    {
        return await this.getCurrency(userId, { id: currencyId ?? null });
    }

    public static async getCurrency(userId: string, where: Omit<FindOptionsWhere<Currency>, 'owner'>)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: userId ?? null }});
        if (!user) throw createHttpError(404, `Cannot find user with id '${userId}'`);

        const result = await CurrencyRepository.getInstance().findOne(
        {
            where: { ...where, owner: { id: userId } },
            relations: { owner: true, fallbackRateCurrency: true }
        });

        if (!result) throw createHttpError(404, `Cannot find currency with query \"${JSON.stringify(where)}\"'`);
        return result;
    }

    public static async createCurrency(userId: string, 
        name: string, 
        amount: Decimal | undefined, 
        refCurrencyId: string | undefined,
        ticker: string)
    {
        // if (!!refCurrencyId !== !!amount)
        //     throw createHttpError(400, `If refCurrency is defined than amount must also be defined.`);

        // Check refCurrencyId exists if refCurrencyId is defined.
        if (refCurrencyId && !(await CurrencyRepository.getInstance().isCurrencyByIdExists(refCurrencyId, userId)))
            throw createHttpError(404, `Cannot find ref currency with id '${refCurrencyId}'`);

        if (!!(await CurrencyRepository.getInstance().isCurrencyByNameExists(name, userId)))
            throw createHttpError(400, `Currency with name '${name}' already exists.`);

        if (!!(await CurrencyRepository.getInstance().isCurrencyByTickerExists(ticker, userId)))
            throw createHttpError(400, `Currency with ticker '${ticker}' already exists.`);

        const newCurrency = CurrencyRepository.getInstance().create();
        newCurrency.name = name;
        newCurrency.owner = await UserRepository.getInstance().findOne({where:{id: userId}});
        newCurrency.ticker = ticker;
        if (refCurrencyId)
            newCurrency.fallbackRateCurrency = await CurrencyRepository.getInstance().findOne({where:{id: refCurrencyId}});
        newCurrency.isBase = (amount === undefined && refCurrencyId === undefined);
        newCurrency.fallbackRateAmount = amount == undefined ? undefined : amount.toFixed();
        await CurrencyRepository.getInstance().save(newCurrency);
        return newCurrency;
    }

    public static async rateHydrateCurrency(userId:string, currency: SQLitePrimitiveOnly<Currency>[], date: number | undefined): Promise<RateHydratedPrimitiveCurrency[]>
    public static async rateHydrateCurrency(userId:string, currency: SQLitePrimitiveOnly<Currency>, date: number | undefined): Promise<RateHydratedPrimitiveCurrency>
    public static async rateHydrateCurrency(userId:string, currencies: SQLitePrimitiveOnly<Currency>[] | SQLitePrimitiveOnly<Currency>, date: number | undefined = undefined)
        : Promise<RateHydratedPrimitiveCurrency | RateHydratedPrimitiveCurrency[]>
    {
        type outputType = { currency: SQLitePrimitiveOnly<Currency>, rateToBase: string };
        const getRateToBase = async (c: SQLitePrimitiveOnly<Currency>) => (await CurrencyCalculator.currencyToBaseRate(userId, c, new Date(date))).toString();

        if (Array.isArray(currencies))
        {
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
        else
        {
            return {
                currency: currencies,
                rateToBase: await getRateToBase(currencies)
            }
        }
    }
}