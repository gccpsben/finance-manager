import { Repository, QueryRunner } from 'typeorm';
import { Currency, keyNameOfCurrency } from "../entities/currency.entity.ts";
import { CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME, CurrencyRateSource, keyNameOfCurrencyRateSource } from "../entities/currencyRateSource.entity.ts";
import { panic } from "../../std_errors/monadError.ts";
import { DataSource } from "typeorm/browser";
import { PATCH_IGNORE, QUERY_IGNORE } from "../../symbols.ts";
import { nameof, nameofNoQuote, paginateQuery } from "../servicesUtils.ts";
import { UserRepository } from "./user.repository.ts";
import { UserNotFoundError } from "../services/user.service.ts";
import { CurrencyCache } from "../caches/currencyListCache.cache.ts";
import { MeteredRepository } from "../meteredRepository.ts";
import { UUID } from "node:crypto";

// Because of how stupid TypeORM is, double quoted column names don't work well with leftJoinAndSelect.
// We may hardcode the column names in string, but we also want key-name type checking in Typescript.
const JOIN_CURR_WITH_REF_CURR_ID_RELATION_NAME = nameofNoQuote<CurrencyRateSource>('refCurrencyId');

export class CurrencyRepository extends MeteredRepository
{
    #dataSource: DataSource;
    #repository: Repository<Currency>;

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(Currency);
    }

    /**
     * Query the cache for users' currencies or query the database if not found.
     * ```
     * ```
     * Notice that this will NOT load any relationship,
     * therefore all foreign keys are represented by strings only.
     * ```
     * ```
     * This method will simply find the first row matched.
     * ```
     * ```
     * This method works in the operator **"AND"**.
     */
    public async findCurrencyByIdNameTickerOne
    (
        ownerId: UUID,
        currencyId: UUID | typeof QUERY_IGNORE,
        currencyName: string | typeof QUERY_IGNORE,
        currencyTicker: string | typeof QUERY_IGNORE,
        cache: CurrencyCache | null
    )
    {
        const makeOutput = (curr: Partial<Currency>) => {
            return {
                fallbackRateCurrencyId: curr.fallbackRateCurrencyId === undefined ? null : curr.fallbackRateCurrencyId,
                id: curr.id!,
                isBase: curr.isBase!,
                name: curr.name!,
                ownerId: curr.ownerId!,
                ticker: curr.ticker!,
                fallbackRateAmount: curr.fallbackRateAmount === undefined ? null : curr.fallbackRateAmount,
                lastRateCronUpdateTime: curr.lastRateCronUpdateTime === undefined ? null : curr.lastRateCronUpdateTime,
            }
        };

        if (cache && currencyId !== QUERY_IGNORE)
        {
            const cacheResult = cache.queryCurrency(ownerId, currencyId);
            if (cacheResult) return makeOutput(cacheResult);
        }

        const whereQuery = (() =>
        {
            const output: {[key: string]: any} = { owner: { id: ownerId } };
            if (currencyId !== QUERY_IGNORE) output['id'] = currencyId;
            if (currencyName !== QUERY_IGNORE) output['name'] = currencyName;
            if (currencyTicker !== QUERY_IGNORE) output['ticker'] = currencyTicker;
            return output;
        })();

        this.incrementRead();
        const currency = await this.#repository.findOne(
        {
            where: whereQuery,
            relations: { owner: false }
        });
        if (!currency) return null;

        cache?.cacheCurrency(ownerId, {
            fallbackRateAmount: currency.fallbackRateAmount ?? undefined,
            fallbackRateCurrencyId: currency.fallbackRateCurrencyId ?? undefined,
            id: currency.id!,
            isBase: currency.isBase!,
            ownerId: currency.ownerId!,
            ticker: currency.ticker!,
        });

        return makeOutput(currency);
    }

    public async updateCurrency
    (
        currencyObj:
        {
            id: UUID,
            name: string | typeof PATCH_IGNORE,
            fallbackRateAmount: string | null | typeof PATCH_IGNORE,
            fallbackRateCurrencyId?: UUID | null | typeof PATCH_IGNORE,
            ownerId: UUID | typeof PATCH_IGNORE,
            isBase: boolean | typeof PATCH_IGNORE,
            ticker: string | typeof PATCH_IGNORE,
            lastRateCronUpdateTime: number | null | typeof PATCH_IGNORE
        },
        cache: CurrencyCache | null
    )
    {
        this.incrementWrite();
        const saveResult = await this.#repository.save(
        {
            id: currencyObj.id,
            fallbackRateAmount: currencyObj.fallbackRateAmount === PATCH_IGNORE ? undefined : currencyObj.fallbackRateAmount,
            fallbackRateCurrency: undefined,
            fallbackRateCurrencyId: currencyObj.fallbackRateCurrencyId === PATCH_IGNORE ? undefined : currencyObj.fallbackRateCurrencyId,
            isBase: currencyObj.isBase === PATCH_IGNORE ? undefined : currencyObj.isBase,
            lastRateCronUpdateTime: currencyObj.lastRateCronUpdateTime === PATCH_IGNORE ? undefined : currencyObj.lastRateCronUpdateTime,
            name: currencyObj.name === PATCH_IGNORE ? undefined : currencyObj.name,
            owner: undefined,
            ownerId: currencyObj.ownerId === PATCH_IGNORE ? undefined : currencyObj.ownerId,
            ticker: currencyObj.ticker === PATCH_IGNORE ? undefined : currencyObj.ticker,
        }) as Currency;

        cache?.cacheCurrency(saveResult.ownerId, {
            fallbackRateAmount: saveResult.fallbackRateAmount ?? undefined,
            fallbackRateCurrencyId: saveResult.fallbackRateCurrencyId ?? undefined,
            id: saveResult.id!,
            isBase: saveResult.isBase,
            ownerId: saveResult.ownerId,
            ticker: saveResult.ticker
        });

        return {
            id: saveResult.id!,
            name: saveResult.name,
            fallbackRateAmount: saveResult.fallbackRateAmount,
            fallbackRateCurrencyId: saveResult.fallbackRateCurrencyId,
            ownerId: saveResult.ownerId,
            isBase: saveResult.isBase,
            ticker: saveResult.ticker,
            lastRateCronUpdateTime: saveResult.lastRateCronUpdateTime
        }
    }

    /**
     * Write (insert) a new currency into the database.
     * This will NOT check beforehand if the currency exists or not.
     * This will NOT check for constrains / validations beforehand.
     * Any error reported by the database engine will be thrown as exception.
     */
    public async saveNewCurrency
    (
        currencyObj:
        {
            name: string,
            fallbackRateAmount?: string | null,
            fallbackRateCurrencyId?: UUID | null,
            ownerId: UUID,
            isBase: boolean,
            ticker: string,
            lastRateCronUpdateTime?: number | null
        },
        queryRunner: QueryRunner,
        cache: CurrencyCache | null
    )
    {
        const repo = queryRunner.manager.getRepository(Currency)
        const newCurrency = repo.create(currencyObj);

        this.incrementWrite();
        // All relations are undefined, since we are only saving the foreign keys.
        const savedNewCurrency: Currency = await repo.save(
        {
            fallbackRateAmount: newCurrency.fallbackRateAmount ?? undefined,
            fallbackRateCurrency: undefined,
            fallbackRateCurrencyId: newCurrency.fallbackRateCurrencyId ?? undefined,
            isBase: newCurrency.isBase,
            lastRateCronUpdateTime: newCurrency.lastRateCronUpdateTime ?? undefined,
            name: newCurrency.name,
            owner: undefined,
            ownerId: newCurrency.ownerId,
            ticker: newCurrency.ticker
        });

        if (!savedNewCurrency.id) throw panic(`Currencies saved into database contain falsy IDs.`);

        cache?.cacheCurrency(currencyObj.ownerId, {
            fallbackRateAmount: savedNewCurrency.fallbackRateAmount ?? undefined,
            fallbackRateCurrencyId: savedNewCurrency.fallbackRateCurrencyId ?? undefined,
            id: savedNewCurrency.id,
            isBase: savedNewCurrency.isBase,
            ownerId: savedNewCurrency.ownerId,
            ticker: savedNewCurrency.ticker
        });

        return {
            id: savedNewCurrency.id!,
            name: savedNewCurrency.name,
            fallbackRateAmount: savedNewCurrency.fallbackRateAmount,
            fallbackRateCurrencyId: savedNewCurrency.fallbackRateCurrencyId,
            ownerId: savedNewCurrency.ownerId,
            isBase: savedNewCurrency.isBase,
            ticker: savedNewCurrency.ticker,
            lastRateCronUpdateTime: savedNewCurrency.lastRateCronUpdateTime
        }
    }

    public async getAllUsersCurrWithSources()
    {
        type currTableAlias = "currencies_table";
        const currTableAlias = "currencies_table" satisfies currTableAlias;
        const srcTableAlias = "src_table";

        this.incrementRead();

        // エンティティの関連を使用
        const rawItems = await this.#repository.createQueryBuilder(currTableAlias)
        .leftJoinAndSelect
        (
            CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME,
            srcTableAlias,
            `${srcTableAlias}.${JOIN_CURR_WITH_REF_CURR_ID_RELATION_NAME} = ${currTableAlias}.${keyNameOfCurrency('id')}`
        )
        .where(`${srcTableAlias}.${keyNameOfCurrencyRateSource('id')} IS NOT NULL`)
        .addSelect(`${srcTableAlias}.id`)
        .getRawMany();

        const output = rawItems.map(item => (
        {
            currency: {
                id: item[`${currTableAlias}_${keyNameOfCurrency('id')}`] as UUID,
                name: item[`${currTableAlias}_${keyNameOfCurrency('name')}`] as string,
                ownerId: item[`${currTableAlias}_${keyNameOfCurrency('ownerId')}`] as UUID,
                ticker: item[`${currTableAlias}_${keyNameOfCurrency('ticker')}`] as string,
                lastRateCronUpdateTime: item[`${currTableAlias}_${keyNameOfCurrency('lastRateCronUpdateTime')}`] as number | null,
            },
            rateSource: {
                id: item[`${srcTableAlias}_${keyNameOfCurrencyRateSource('id')}`] as UUID,
                hostname: item[`${srcTableAlias}_${keyNameOfCurrencyRateSource('hostname')}`] as string,
                jsonQueryString: item[`${srcTableAlias}_${keyNameOfCurrencyRateSource('jsonQueryString')}`] as string,
                lastExecuteTime: item[`${srcTableAlias}_${keyNameOfCurrencyRateSource('lastExecuteTime')}`] as number | null,
                name: item[`${srcTableAlias}_${keyNameOfCurrencyRateSource('name')}`] as string,
            }
        }));

        const groupedByCurrId = (() =>
        {
            type outputItemType = typeof output[0];
            const groupedOutput:
            {
                [currId: UUID]:
                {
                    currency: outputItemType['currency'],
                    rateSources: outputItemType['rateSource'][]
                }
            } = {};
            for (const curr of Object.values(output))
            {
                if (!groupedOutput[curr.currency.id])
                    groupedOutput[curr.currency.id] = { currency: curr.currency, rateSources: [] };
                groupedOutput[curr.currency.id].rateSources.push(curr.rateSource);
            }
            return groupedOutput;
        })();

        return groupedByCurrId;
    }

    public async getCurrencies
    (
        ownerId: UUID,
        query:
        {
            startIndex?: number | undefined,
            endIndex?: number | undefined,
            name?: string | undefined,
            id?: UUID | undefined
        }
    )
    {
        const user = await UserRepository.getInstance().findOne({ where: { id: ownerId ?? null } });
        if (!user) return new UserNotFoundError(ownerId);

        let dbQuery = this.#repository
        .createQueryBuilder(`curr`)
        .where(`${nameof<Currency>('ownerId')} = :ownerId`, { ownerId: ownerId ?? null });

        if (query.name) dbQuery = dbQuery.andWhere("name = :name", { name: query.name ?? null })
        if (query.id) dbQuery = dbQuery.andWhere("id = :id", { id: query.id ?? null })
        dbQuery = paginateQuery(dbQuery, query);

        this.incrementRead();
        const queryResult = await dbQuery.getManyAndCount();
        if (queryResult[0].some(x => !x.id)) throw panic(`Currencies queried from database contain falsy IDs`);

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0].map(c => {
                return {
                    id: c.id!,
                    isBase: c.isBase,
                    ownerId: c.ownerId,
                    ticker: c.ticker,
                    name: c.name,
                    fallbackRateAmount: c.fallbackRateAmount ?? null,
                    fallbackRateCurrencyId: c.fallbackRateCurrencyId ?? null,
                    lastRateCronUpdateTime: c.lastRateCronUpdateTime === undefined ? null : c.lastRateCronUpdateTime
                }
            })
        }
    }
}