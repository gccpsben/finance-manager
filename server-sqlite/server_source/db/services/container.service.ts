import createHttpError from "http-errors";
import { ContainerRepository } from "../repositories/container.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { Container } from "../entities/container.entity.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { TransactionService } from "./transaction.service.js";
import { Decimal } from "decimal.js";
import { CurrencyListCache } from "../caches/currencyListCache.cache.js";
import { CurrencyRateDatumsCache } from '../repositories/currencyRateDatum.repository.js';
import { CurrencyCalculator, CurrencyService } from "./currency.service.js";
import { Currency } from "../entities/currency.entity.js";
export class ContainerService
{
    public static async tryGetContainerByName(ownerId: string, name: string)
    {
        const container = await ContainerRepository.getInstance().findOne(
        {
            where: {name: name, owner: { id: ownerId } },
            relations: { owner: true }
        });
        return {
            containerFound: container !== null,
            container: container
        }
    }

    public static async tryGetContainerById(ownerId: string, id: string)
    {
        const container = await ContainerRepository.getInstance().findOne(
        {
            where: {id: id, owner: { id: ownerId } },
            relations: { owner: true }
        });
        return {
            containerFound: container !== null,
            container: container
        }
    }

    public static async createContainer(ownerId: string, name: string, creationDate: number = Date.now())
    {
        const containerWithSameName = await ContainerService.tryGetContainerByName(ownerId, name);
        if (containerWithSameName.containerFound)
            throw createHttpError(400, `Container with name '${name}' already exists.`);
        const newContainer = ContainerRepository.getInstance().create();
        newContainer.creationDate = creationDate;
        newContainer.name = name;
        newContainer.owner = await UserRepository.getInstance().findOne({where: {id: ownerId}});
        return await ContainerRepository.getInstance().save(newContainer);
    }

    public static async getOneContainer(ownerId: string, query: {
        name? : string | undefined,
        id? : string | undefined
    })
    {
        return await ContainerRepository.getInstance().findOne(
        {
            where:
            {
                id: query.id,
                name: query.name,
                owner: {id: ownerId}
            }
        });
    }

    public static async getManyContainers
    (
        ownerId: string,
        query:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            name?: string | undefined,
            id?: string | undefined
        }
    ): Promise<{ totalCount: number, rangeItems: SQLitePrimitiveOnly<Container>[] }>
    {
        let dbQuery = ContainerRepository.getInstance()
        .createQueryBuilder(`con`)
        .where(`${nameof<Container>("ownerId")} = :ownerId`, { ownerId: ownerId });

        if (query.name) dbQuery = dbQuery.andWhere(`${nameof<Container>("name")} = :name`, { name: query.name })
        if (query.id) dbQuery = dbQuery.andWhere(`${nameof<Container>("id")} = :id`, { id: query.id })
        dbQuery = ServiceUtils.paginateQuery(dbQuery, query);

        const queryResult = await dbQuery.getManyAndCount();
        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0]
        }
    }

    public static async getContainersBalance
    (
        ownerId: string,
        containers: SQLitePrimitiveOnly<Container>[] | string[],
        currenciesCache: CurrencyListCache|undefined = undefined
    )
    {
        if (currenciesCache === undefined) currenciesCache = new CurrencyListCache(ownerId);
        await currenciesCache.ensureCurrenciesList();

        let relevantTxns = await TransactionService.getContainersTransactions(ownerId, containers);
        const containersBalancesMapping = await (async () =>
        {
            const output: { [containerId: string]: { [currencyId: string]: Decimal } } = {};
            const append = (containerId: string, currencyId:string, amount: string, isNegative = false) => 
            {
                const deltaAmount = isNegative ? new Decimal(amount).neg() : new Decimal(amount);
                if (output[containerId] === undefined) output[containerId] = {};
                if (output[containerId][currencyId] === undefined)
                    return output[containerId][currencyId] = new Decimal(deltaAmount);
                output[containerId][currencyId] = output[containerId][currencyId].add(new Decimal(deltaAmount));
            };

            for (const txn of relevantTxns)
            {
                if (txn.fromAmount) append(txn.fromContainerId, txn.fromCurrencyId, txn.fromAmount, true);
                if (txn.toAmount) append(txn.toContainerId, txn.toCurrencyId, txn.toAmount);
            }

            return output;
        })();

        return containersBalancesMapping;
    }

    public static async valueHydrateContainers
    (
        ownerId: string,
        containers: SQLitePrimitiveOnly<Container>[] | string[],
        currencyRateDateToUse: number | undefined = undefined,
        currenciesCache: CurrencyListCache|undefined = undefined,
        currencyRatesCache: CurrencyRateDatumsCache|undefined = undefined
    )
    {
        const innerRateEpoch = currencyRateDateToUse === undefined ? Date.now() : currencyRateDateToUse;
        const innerRateDateObj = new Date(innerRateEpoch);
        const containerBalances = await ContainerService.getContainersBalance(ownerId, containers, currenciesCache);

        // The list of currency ids that are present in `containerBalances`
        const relevantCurrencyIds = Array.from((() =>
        {
            const currencyIds: string[] = [];
            for (const [_, balances] of Object.entries(containerBalances))
                currencyIds.push(...Object.keys(balances));
            return new Set([...currencyIds]);
        })());

        const relevantCurrencies = await (async () =>
        {
            const output: { [currencyId: string]: SQLitePrimitiveOnly<Currency> } = {};
            const getCurrById = async (id: string) =>
            {
                // Find the requested currency in `knownCurrencies` first.
                const potentialCacheHit = currenciesCache?.getCurrenciesList()?.find(c => c.ownerId === ownerId && c.id === id);
                if (potentialCacheHit) return potentialCacheHit;

                if (currenciesCache) // if cache object exists but still cannot find the currency, we want to fetch all currencies and cache it
                {
                    await currenciesCache.ensureCurrenciesList();
                    return currenciesCache.getCurrenciesList().find(c => c.id === id);
                }
                // if cache object doesnt exist, we just want to fetch the bare min
                else return CurrencyService.getCurrencyById(ownerId, id);
            };

            for (const cId of relevantCurrencyIds)
                output[cId] = await getCurrById(cId);

            return output;
        })();

        // The mapping between each currency and its rate at the given date.
        const ratesAtGivenEpoch = await (async () =>
        {
            const output: { [currencyId: string]: Decimal } = {};
            for (const currencyId of relevantCurrencyIds)
            {
                output[currencyId] = await CurrencyCalculator.currencyToBaseRate
                (
                    ownerId,
                    relevantCurrencies[currencyId],
                    innerRateDateObj,
                    currenciesCache,
                    currencyRatesCache
                );
            }
            return output;
        })();

        const containerValues: { [containerId: string]: Decimal } = await (async () =>
        {
            const output: { [containerId:string]:Decimal } = {};
            for (const [containerId, balances] of Object.entries(containerBalances))
            {
                let containerValue = new Decimal(0);
                for (const [currencyId, amount] of Object.entries(balances))
                    containerValue = containerValue.add(ratesAtGivenEpoch[currencyId].mul(amount));
                output[containerId] = containerValue;
            }
            return output;
        })();

        return {
            values: containerValues,
            balances: containerBalances
        };
    }
}