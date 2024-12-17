import { Repository } from "typeorm";
import { Currency } from "../entities/currency.entity.js";
import { CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME, CurrencyRateSource } from "../entities/currencyRateSource.entity.js";
import { panic } from "../../std_errors/monadError.js";
import { DataSource } from "typeorm/browser";
import { PATCH_IGNORE, QUERY_IGNORE } from "../../symbols.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { UserRepository } from "./user.repository.js";
import { IdBound } from "../../index.d.js";
import { UserNotFoundError } from "../services/user.service.js";

export class CurrencyRepository
{
    #dataSource: DataSource;
    #repository: Repository<Currency>;

    public constructor (datasource: DataSource)
    {
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(Currency);
    }

    /**
     * Query the database for users' currencies. Notice that this will NOT load any relationship,
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
        ownerId: string,
        currencyId: string | typeof QUERY_IGNORE,
        currencyName: string | typeof QUERY_IGNORE,
        currencyTicker: string | typeof QUERY_IGNORE
    )
    {
        const whereQuery = (() =>
        {
            const output: {[key: string]: any} = { owner: { id: ownerId } };
            if (currencyId !== QUERY_IGNORE) output['id'] = currencyId;
            if (currencyName !== QUERY_IGNORE) output['name'] = currencyName;
            if (currencyTicker !== QUERY_IGNORE) output['ticker'] = currencyTicker;
            return output;
        })();

        const currency = await this.#repository.findOne(
        {
            where: whereQuery,
            relations: { owner: false }
        });
        if (!currency) return null;

        return {
            fallbackRateCurrencyId: currency.fallbackRateCurrencyId === undefined ? null : currency.fallbackRateCurrencyId,
            id: currency.id!,
            isBase: currency.isBase!,
            name: currency.name!,
            ownerId: currency.ownerId!,
            ticker: currency.ticker!,
            fallbackRateAmount: currency.fallbackRateAmount === undefined ? null : currency.fallbackRateAmount,
            lastRateCronUpdateTime: currency.lastRateCronUpdateTime === undefined ? null : currency.lastRateCronUpdateTime,
        };
    }

    public async updateCurrency
    (
        currencyObj:
        {
            id: string,
            name: string | typeof PATCH_IGNORE,
            fallbackRateAmount: string | null | typeof PATCH_IGNORE,
            fallbackRateCurrencyId?: string | null | typeof PATCH_IGNORE,
            ownerId: string | typeof PATCH_IGNORE,
            isBase: boolean | typeof PATCH_IGNORE,
            ticker: string | typeof PATCH_IGNORE,
            lastRateCronUpdateTime: number | null | typeof PATCH_IGNORE
        }
    )
    {
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
            fallbackRateCurrencyId?: string | null,
            ownerId: string,
            isBase: boolean,
            ticker: string,
            lastRateCronUpdateTime?: number | null
        }
    )
    {
        const newCurrency = this.#repository.create(currencyObj);

        // All relations are undefined, since we are only saving the foreign keys.
        const savedNewCurrency: Currency = await this.#repository.save(
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

    // TODO: userid
    public async getAllUsersCurrWithSources()
    {
        type currTableAlias = "currencies_table";
        const currTableAlias = "currencies_table" satisfies currTableAlias;
        const srcTableAlias = "src_table";
        const keyOfRateSrc = (x: keyof CurrencyRateSource) => x;
        const keyOfCurr = (x: keyof Currency) => x;

        // エンティティの関連を使用
        const rawItems = await this.#repository.createQueryBuilder(currTableAlias)
        .leftJoinAndSelect
        (
            CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME,
            srcTableAlias,
            `${srcTableAlias}.${keyOfRateSrc('refCurrencyId')} = ${currTableAlias}.${keyOfCurr('id')}`
        )
        .where(`${srcTableAlias}.${keyOfRateSrc('id')} IS NOT NULL`)
        .addSelect(`${srcTableAlias}.id`)
        .getRawMany();

        const output = rawItems.map(item => (
        {
            currency: {
                id: item[`${currTableAlias}_${keyOfCurr('id')}`],
                name: item[`${currTableAlias}_${keyOfCurr('name')}`],
                ownerId: item[`${currTableAlias}_${keyOfCurr('ownerId')}`],
                ticker: item[`${currTableAlias}_${keyOfCurr('ticker')}`],
                lastRateCronUpdateTime: item[`${currTableAlias}_${keyOfCurr('lastRateCronUpdateTime')}`] as number | null,
            },
            rateSource: {
                id: item[`${srcTableAlias}_${keyOfRateSrc('id')}`],
                hostname: item[`${srcTableAlias}_${keyOfRateSrc('hostname')}`],
                jsonQueryString: item[`${srcTableAlias}_${keyOfRateSrc('jsonQueryString')}`],
                lastExecuteTime: item[`${srcTableAlias}_${keyOfRateSrc('lastExecuteTime')}`],
                name: item[`${srcTableAlias}_${keyOfRateSrc('name')}`],
            }
        }));

        const groupedByCurrId = (() =>
        {
            type outputItemType = typeof output[0];
            const groupedOutput:
            {
                [currId: string]:
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
        ownerId: string,
        query:
        {
            startIndex?: number | undefined,
            endIndex?: number | undefined,
            name?: string | undefined,
            id?: string | undefined
        }
    ): Promise<{ totalCount: number, rangeItems: IdBound<Currency>[] } | UserNotFoundError>
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId ?? null }});
        if (!user) return new UserNotFoundError(ownerId);

        let dbQuery = this.#repository
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
}