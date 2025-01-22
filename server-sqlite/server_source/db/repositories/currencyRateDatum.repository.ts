import { DataSource, QueryRunner, Repository } from "typeorm";
import { CurrencyRateDatum, nameofCRD } from "../entities/currencyRateDatum.entity.ts";
import { Database } from "../db.ts";
import { CurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.ts";
import { panic } from "../../std_errors/monadError.ts";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.ts";
import { CurrencyNotFoundError } from "../services/currency.service.ts";
import { UserNotFoundError } from "../services/user.service.ts";
import { QUERY_IGNORE } from "../../symbols.ts";
import { CurrencyCache } from "../caches/currencyListCache.cache.ts";
import { MeteredRepository } from "../meteredRepository.ts";

export class CurrencyRateDatumRepository extends MeteredRepository
{
    #dataSource: DataSource;
    #repository: Repository<CurrencyRateDatum>;

    /**
     * Get the nearest 2 datum to a given `date`. *May return 0 or 1 datum if not available.*
     * #### Notice that the datums returned may NOT be on each of the direction of the given date.
     * #### Two of the datums may both be *before* or *after* the given date.
     */
    public async findNearestTwoDatum
    (
        userId: string,
        currencyId: string, date: number,
        cache: CurrencyRateDatumsCache | null
    )
    {
        const cachedTwoDatums = cache?.findTwoNearestDatum(userId, currencyId, date);
        if (cachedTwoDatums !== undefined) return cachedTwoDatums;

        let query = this.#repository.createQueryBuilder(`datum`);
        query = query.where(`ownerId = :ownerId`, { ownerId: userId ?? null });
        query = query.andWhere(`refCurrencyId = :refCurrencyId`, { refCurrencyId: currencyId ?? null });
        query = query.setParameter("_target_date_", date);
        query = query.select(`abs(datum.date - :_target_date_)`, `difference`);
        query = query.orderBy("difference", 'ASC');
        query = query.addSelect("*");

        this.incrementRead();
        const results = await query.getRawMany() as
        {
            difference: number,
            id: string,
            amount: string,
            refCurrencyId: string,
            refAmountCurrencyId: string,
            ownerId: string,
            date: number
        }[];

        cache?.cacheRateDatums(userId, currencyId, results);
        return results.slice(0,2);
    }

    public async getCurrencyDatums
    (
        userId:string,
        currencyId: string,
        startDate: number | undefined = undefined,
        endDate: number | undefined = undefined,
        currencyDateDatumsCache: CurrencyRateDatumsCache | null
    )
    {
        const cache_result = currencyDateDatumsCache?.queryRateDatums(userId, currencyId);
        if (cache_result !== undefined)
        {
            return cache_result.filter(x => {
                if (startDate !== undefined && !(x.date >= startDate))
                    return false;
                if (endDate !== undefined && !(x.date <= endDate))
                    return false;
                return true;
            });
        }

        let query = this.#repository
        .createQueryBuilder(`datum`)
        .where(`${nameofCRD('ownerId')} = :ownerId`, { ownerId: userId ?? null });
        query = query.andWhere(`${nameofCRD('refCurrencyId')} = :refCurrencyId`, { refCurrencyId: currencyId ?? null });
        query = query.addSelect("*");
        if (startDate) query = query.andWhere(`${nameofCRD('date')} >= :startDate`, { startDate: startDate });
        if (endDate) query = query.andWhere(`${nameofCRD('date')} <= :endDate`, { endDate: endDate });

        this.incrementRead();
        const results = await query.getMany();

        // We only cache datums that are full.
        if (startDate === undefined && endDate === undefined && !!currencyDateDatumsCache)
            currencyDateDatumsCache.cacheRateDatums(userId, currencyId, results.map(r => ({
                amount: r.amount,
                date: r.date,
                id: r.id!,
                ownerId: r.ownerId,
                refAmountCurrencyId: r.refAmountCurrencyId,
                refCurrencyId: r.refCurrencyId,
            })));

        // We only want to returned whitelisted properties, to keep the interface simple
        // and explicit
        return results.map(r => ({
            id: r.id,
            amount: r.amount,
            refCurrencyId: r.refCurrencyId,
            refAmountCurrencyId: r.refAmountCurrencyId,
            ownerId: r.ownerId,
            date: r.date
        }));
    }

    public async createCurrencyRateDatum
    (
        datums:
        {
            userId: string,
            amount: string,
            date: number,
            currencyId: string,
            amountCurrencyId: string
        }[],
        queryRunner: QueryRunner,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyListCache: CurrencyCache | null
    ): Promise<{
            amount: string,
            date: number,
            id: string,
            ownerId: string,
            refAmountCurrencyId: string,
            refCurrencyId: string
        }[] | UserNotFoundError | CurrencyNotFoundError>
    {
        const savedDatums: {
            amount: string,
            date: number,
            id: string,
            ownerId: string,
            refAmountCurrencyId: string,
            refCurrencyId: string
        }[] = [];

        const currRepo = Database.getCurrencyRepository()!;

        for (const datum of datums)
        {
            currencyRateDatumsCache?.invalidateRateDatums(datum.userId, datum.currencyId);
            currencyToBaseRateCache?.invalidateCurrencyToBase(datum.userId, datum.currencyId);

            const newRate = queryRunner.manager.getRepository(CurrencyRateDatum).create();
            newRate.amount = datum.amount.toString();
            newRate.date = datum.date;
            newRate.ownerId = datum.userId;

            const refCurrency = await currRepo.findCurrencyByIdNameTickerOne(datum.userId, datum.currencyId, QUERY_IGNORE, QUERY_IGNORE, currencyListCache);
            const refAmountCurrency = await currRepo.findCurrencyByIdNameTickerOne(datum.userId, datum.amountCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyListCache);
            if (refAmountCurrency instanceof UserNotFoundError) return refAmountCurrency;
            if (refCurrency instanceof UserNotFoundError) return refCurrency;
            if (refCurrency === null) return new CurrencyNotFoundError(datum.userId, datum.currencyId);
            if (refAmountCurrency === null) return new CurrencyNotFoundError(datum.userId, datum.amountCurrencyId);

            newRate.refCurrencyId = refCurrency.id;
            newRate.refAmountCurrencyId = refAmountCurrency.id;

            this.incrementWrite();
            const newlySavedDatum = await this.#repository.save(newRate);
            if (!newlySavedDatum.id) throw panic(`Newly saved currency rate datum contains falsy IDs.`);

            savedDatums.push({
                amount: newlySavedDatum.amount,
                date: newlySavedDatum.date,
                id: newlySavedDatum.id,
                ownerId: newlySavedDatum.ownerId,
                refAmountCurrencyId: newlySavedDatum.refAmountCurrencyId,
                refCurrencyId: newlySavedDatum.refCurrencyId
            });
        }

        return savedDatums;
    }

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(CurrencyRateDatum);
    }
}