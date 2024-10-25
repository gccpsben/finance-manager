import { Repository } from "typeorm";
import { CurrencyRateDatum } from "../entities/currencyRateDatum.entity.js";
import { Database } from "../db.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { isDate } from "class-validator";
import { RepositoryCache } from "../dataCache.js";
import { GlobalCurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.js";

export type DifferenceHydratedCurrencyRateDatum = SQLitePrimitiveOnly<CurrencyRateDatum> &
{ difference: number }

const nameofD = (k: keyof CurrencyRateDatum) => k;

export class CurrencyRateDatumsCache extends RepositoryCache
{
    private _datumsList: { [currId: string]: SQLitePrimitiveOnly<CurrencyRateDatum>[] } = {};
    public constructor(ownerId: string) { super(ownerId); }

    public getCurrenciesRateDatumsList(currId: string) { return this._datumsList[currId]; }
    public setCurrenciesRateDatumsList(currId: string, list: SQLitePrimitiveOnly<CurrencyRateDatum>[])
    {
        if (list.find(x => x.ownerId !== this._ownerId))
            throw new Error(`DataCache owner mismatch: Data inserted into DataCache must only belong to one user.`);
        this._datumsList[currId] = list;
    }
    public async ensureCurrenciesRateDatumsList(currId: string)
    {
        const ratesDatums = await CurrencyRateDatumRepository.getInstance().getCurrencyDatums(this._ownerId, currId);
        this.setCurrenciesRateDatumsList(currId, ratesDatums);
        return ratesDatums;
    }
    public getRawDatumsList() { return this._datumsList }
}

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
        currencyId: string, date: Date,
    ): Promise<DifferenceHydratedCurrencyRateDatum[]>
    {
        if (!date || !isDate(date)) throw new Error(`findNearestTwoDatum: The provided date is not a date object.`);
        const cachedTwoDatums = GlobalCurrencyRateDatumsCache.findTwoNearestDatum(userId, currencyId, date);
        if (cachedTwoDatums !== undefined) return cachedTwoDatums;

        let query = this.createQueryBuilder(`datum`);
        query = query.where(`ownerId = :ownerId`, { ownerId: userId ?? null });
        query = query.andWhere(`refCurrencyId = :refCurrencyId`, { refCurrencyId: currencyId ?? null });
        query = query.setParameter("_target_date_", date.getTime());
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