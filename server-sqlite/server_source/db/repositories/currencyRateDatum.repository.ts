import { Repository } from "typeorm";
import { CurrencyRateDatum } from "../entities/currencyRateDatum.entity.js";
import { Database } from "../db.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { isDate } from "class-validator";

export type DifferenceHydratedCurrencyRateDatum = SQLitePrimitiveOnly<CurrencyRateDatum> &
{
    difference: number
}

class CurrencyRateDatumRepositoryExtension
{
    /** 
     * Get the nearest 2 datum to a given `date`. *May return 0 or 1 datum if not available.*
     * #### Notice that the datums returned may NOT be on each of the direction of the given date.
     * #### Two of the datums may both be *before* or *after* the given date.
     */
    public async findNearestTwoDatum
    (
        this: Repository<CurrencyRateDatum>, 
        userId: string, 
        currencyId: string,
        date: Date
    ): Promise<DifferenceHydratedCurrencyRateDatum[]>
    {
        if (!date || !isDate(date)) throw new Error(`findNearestTwoDatum: The provided date is not a date object.`);

        const results = await this
        .createQueryBuilder(`datum`)
        .where(`ownerId = :ownerId`, { ownerId: userId })
        .andWhere(`refCurrencyId = :refCurrencyId`, { refCurrencyId: currencyId })
        .setParameter("_target_date_", date.getTime())
        .select(`abs(datum.date - :_target_date_)`, `difference`)
        .orderBy("difference", 'ASC')
        .limit(2)
        .addSelect("*")
        .getRawMany() as (SQLitePrimitiveOnly<CurrencyRateDatum> & { difference: number })[];

        return results;
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