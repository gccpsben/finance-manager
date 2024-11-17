import { Repository } from "typeorm";
import { Currency } from "../entities/currency.entity.js";
import { Database } from "../db.js";
import { CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME, CurrencyRateSource } from "../entities/currencyRateSource.entity.js";

class CurrencyRepositoryExtension
{
    isCurrencyByIdExists = async function (this: Repository<Currency>, currencyId: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne(
        {
            where: { id: currencyId, owner: { id: userId } },
            relations: { owner: true }
        });
        return !!currency;
    }

    isCurrencyByNameExists = async function (this: Repository<Currency>, name: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne(
        {
            where: { name: name, owner: { id: userId } },
            relations: { owner: true }
        });
        return !!currency;
    }

    isCurrencyByTickerExists = async function(this: Repository<Currency>, ticker: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne({where: { ticker: ticker, owner: { id: userId } }});
        return !!currency;
    }

    getAllUsersCurrWithSources = async function(this: Repository<Currency>)
    {
        type currTableAlias = "currencies_table";
        const currTableAlias = "currencies_table" satisfies currTableAlias;
        const srcTableAlias = "src_table";
        const keyOfRateSrc = (x: keyof CurrencyRateSource) => x;
        const keyOfCurr = (x: keyof Currency) => x;

        // エンティティの関連を使用
        const rawItems = await this.createQueryBuilder(currTableAlias)
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
}

export class CurrencyRepository
{
    private static extendedRepo: Repository<Currency> & CurrencyRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!CurrencyRepository.extendedRepo)
            CurrencyRepository.extendedRepo = Database.AppDataSource.getRepository(Currency).extend(new CurrencyRepositoryExtension());

        return CurrencyRepository.extendedRepo;
    }
}