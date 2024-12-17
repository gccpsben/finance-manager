import { Repository } from "typeorm";
import { CurrencyRateDatum } from "../entities/currencyRateDatum.entity.js";
import { Database } from "../db.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { isDate } from "class-validator";
import { RepositoryCache } from "../dataCache.js";
import { GlobalCurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.js";
import { panic } from "../../std_errors/monadError.js";

export type DifferenceHydratedCurrencyRateDatum = SQLitePrimitiveOnly<CurrencyRateDatum> &
{ difference: number }

const nameofD = (k: keyof CurrencyRateDatum) => k;

class CurrencyRateDatumRepositoryExtension
{
    /**
     * Get the nearest 2 datum to a given `date`. *May return 0 or 1 datum if not available.*
     * #### Notice that the datums returned may NOT be on each of the direction of the given date.
     * #### Two of the datums may both be *before* or *after* the given date.
     */
    findNearestTwoDatum = async function
    (
        this: Repository<CurrencyRateDatum>,
        userId: string,
        currencyId: string, date: number,
    ): Promise<DifferenceHydratedCurrencyRateDatum[]>
    {
        const cachedTwoDatums = GlobalCurrencyRateDatumsCache.findTwoNearestDatum(userId, currencyId, date);
        if (cachedTwoDatums !== undefined) return cachedTwoDatums;

        let query = this.createQueryBuilder(`datum`);
        query = query.where(`ownerId = :ownerId`, { ownerId: userId ?? null });
        query = query.andWhere(`refCurrencyId = :refCurrencyId`, { refCurrencyId: currencyId ?? null });
        query = query.setParameter("_target_date_", date);
        query = query.select(`abs(datum.date - :_target_date_)`, `difference`);
        query = query.orderBy("difference", 'ASC');
        query = query.addSelect("*");

        const results = await query.getRawMany() as (SQLitePrimitiveOnly<CurrencyRateDatum> & { difference: number })[];
        GlobalCurrencyRateDatumsCache.cacheRateDatums(userId, currencyId, results);
        return results.slice(0,2);
    }

    getCurrencyDatums = async function
    (
        this: Repository<CurrencyRateDatum>,
        userId:string,
        currencyId: string,
        startDate: number | undefined = undefined,
        endDate: number | undefined = undefined
    )
    {
        let query = this
        .createQueryBuilder(`datum`)
        .where(`${nameofD('ownerId')} = :ownerId`, { ownerId: userId ?? null });
        query = query.andWhere(`${nameofD('refCurrencyId')} = :refCurrencyId`, { refCurrencyId: currencyId ?? null });
        query = query.addSelect("*");
        if (startDate) query = query.andWhere(`${nameofD('date')} >= :startDate`, { startDate: startDate });
        if (endDate) query = query.andWhere(`${nameofD('date')} <= :endDate`, { endDate: endDate });

        const results = await query.getMany();
        return results as (SQLitePrimitiveOnly<CurrencyRateDatum>)[];
    }
}

export class CurrencyRateDatumRepository
{
    private static extendedRepo: (Repository<CurrencyRateDatum> & CurrencyRateDatumRepositoryExtension) | undefined = undefined;

    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        if (!CurrencyRateDatumRepository.extendedRepo)
            CurrencyRateDatumRepository.extendedRepo = Database.AppDataSource.getRepository(CurrencyRateDatum).extend(new CurrencyRateDatumRepositoryExtension())
        return CurrencyRateDatumRepository.extendedRepo;
    }
}