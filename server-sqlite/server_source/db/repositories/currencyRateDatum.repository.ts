import { Repository } from "typeorm";
import { CurrencyRateDatum } from "../entities/currencyRateDatum.entity.js";
import { Database } from "../db.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { isDate } from "class-validator";
import { MutableDataCache } from "../dataCache.js";

export type DifferenceHydratedCurrencyRateDatum = SQLitePrimitiveOnly<CurrencyRateDatum> &
{
    difference: number
}

const nameofD = (k: keyof CurrencyRateDatum) => k;

class CurrencyRateDatumRepositoryExtension
{
    /** 
     * Get the nearest 2 datum to a given `date`. *May return 0 or 1 datum if not available.*
     * #### Notice that the datums returned may NOT be on each of the direction of the given date.
     * #### Two of the datums may both be *before* or *after* the given date.
     */
    public async findNearestTwoDatum
    (
        this: Repository<CurrencyRateDatum>, userId: string,  currencyId: string, date: Date,
        cache: MutableDataCache = undefined
    ): Promise<DifferenceHydratedCurrencyRateDatum[]>
    {
        if (!date || !isDate(date)) throw new Error(`findNearestTwoDatum: The provided date is not a date object.`);

        if (cache?.getCurrenciesRateDatumsList(currencyId))
        {
            const results = cache.getCurrenciesRateDatumsList(currencyId)
            .filter(d => d.ownerId === userId && d.refCurrencyId === currencyId)
            .map(d => ({ ...d, difference: Math.abs(d.date - date.getTime()) }))
            .sort((a,b) => a.difference - b.difference)
            .slice(0,2);
            return results;
        }

        let query = this.createQueryBuilder(`datum`);
        query = query.where(`ownerId = :ownerId`, { ownerId: userId ?? null });
        query = query.andWhere(`refCurrencyId = :refCurrencyId`, { refCurrencyId: currencyId ?? null });
        query = query.setParameter("_target_date_", date.getTime());
        query = query.select(`abs(datum.date - :_target_date_)`, `difference`);
        query = query.orderBy("difference", 'ASC');
        if (!cache) query = query.limit(2); // if there's no cache object provided, no need to fetch all of the datums
        query = query.addSelect("*");

        const results = await query.getRawMany() as (SQLitePrimitiveOnly<CurrencyRateDatum> & { difference: number })[];
        if (cache) cache.setCurrenciesRateDatumsList(currencyId, results); // set to cache if it's defined.

        return results.slice(0,2);
    }

    public async getCurrencyDatums
    (
        this: Repository<CurrencyRateDatum>,
        userId:string, 
        currencyId: string,
        startDate: Date = undefined,
        endDate: Date = undefined
    )
    {
        let query = this
        .createQueryBuilder(`datum`)
        .where(`${nameofD('ownerId')} = :ownerId`, { ownerId: userId ?? null });
        query = query.andWhere(`${nameofD('refCurrencyId')} = :refCurrencyId`, { refCurrencyId: currencyId ?? null });
        query = query.addSelect("*");
        if (startDate) query = query.andWhere(`${nameofD('date')} >= :startDate`, { startDate: startDate.getTime() });
        if (endDate) query = query.andWhere(`${nameofD('date')} <= :endDate`, { endDate: endDate.getTime() });

        const results = await query.getMany();
        return results as (SQLitePrimitiveOnly<CurrencyRateDatum>)[];
    }
}

export class CurrencyRateDatumRepository
{
    private static extendedRepo: Repository<CurrencyRateDatum> & CurrencyRateDatumRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!CurrencyRateDatumRepository.extendedRepo) 
            CurrencyRateDatumRepository.extendedRepo = Database.AppDataSource.getRepository(CurrencyRateDatum).extend(new CurrencyRateDatumRepositoryExtension())      
        return CurrencyRateDatumRepository.extendedRepo;
    }
}