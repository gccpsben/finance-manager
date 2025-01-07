import { UserRepository } from "../repositories/user.repository.js";
import { Decimal } from "decimal.js";
import { CurrencyCalculator } from "./currency.service.js";
import { CurrencyCache } from "../caches/currencyListCache.cache.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { MonadError, unwrap } from "../../std_errors/monadError.js";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { Database } from "../db.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { CurrencyRateDatumsCache } from '../caches/currencyRateDatumsCache.cache.js';
import { ServiceUtils } from "../servicesUtils.js";

export class ContainerNotFoundError extends MonadError<typeof ContainerNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public containerId: string;
    public userId: string;

    constructor(containerId: string, userId: string)
    {
        super(ContainerNotFoundError.ERROR_SYMBOL, `Cannot find the given container with id = ${containerId}`);
        this.name = this.constructor.name;
        this.containerId = containerId;
        this.userId = userId;
    }
}
export class ContainerExistsError extends MonadError<typeof ContainerExistsError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public containerName: string;
    public userId: string;

    constructor(containerName: string, userId: string)
    {
        super(ContainerExistsError.ERROR_SYMBOL, `The given container with name "${containerName}" already exists for user id="${userId}".`);
        this.name = this.constructor.name;
        this.containerName = containerName;
        this.userId = userId;
    }
}

export class ContainerService
{
    public static async createContainer(ownerId: string, name: string, creationDate: number = Date.now())
    : Promise<{id: string, name: string, creationDate: number} | UserNotFoundError | ContainerExistsError>
    {
        const contRepo = Database.getContainerRepository()!;

        const containerWithSameName = await contRepo.getContainer(ownerId, QUERY_IGNORE, name);
        if (containerWithSameName) return new ContainerExistsError(name, ownerId);
        const owner = await UserRepository.getInstance().findOne({where: {id: ownerId}});
        if (owner === null) return new UserNotFoundError(ownerId);

        const savedNewContainer = await contRepo.saveNewContainer(ownerId, name, creationDate);
        return {
            id: savedNewContainer.id,
            name: savedNewContainer.name,
            creationDate: savedNewContainer.creationDate
        }
    }

    public static async getContainersBalance
    (
        ownerId: string,
        containers: { id: string }[] | string[]
    )
    {
        let relevantTxns = await Database.getTransactionRepository()!.getContainersTransactions(ownerId, containers);
        const containersBalancesMapping = (() =>
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
                for (const fragment of txn.fragments)
                {
                    if (fragment.fromAmount && fragment.fromContainerId && fragment.fromCurrencyId)
                        append(fragment.fromContainerId, fragment.fromCurrencyId, fragment.fromAmount, true);
                    if (fragment.toAmount && fragment.toContainerId && fragment.toCurrencyId)
                        append(fragment.toContainerId, fragment.toCurrencyId, fragment.toAmount);
                }
            }

            return output;
        })();

        return containersBalancesMapping;
    }

    public static async valueHydrateContainers
    (
        ownerId: string,
        containers: { id: string }[] | string[],
        currencyRateDateToUse: number | undefined = undefined,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null
    )
    {
        const currRepo = Database.getCurrencyRepository()!;

        const innerRateEpoch = currencyRateDateToUse === undefined ? Date.now() : currencyRateDateToUse;
        const containerBalances = await ContainerService.getContainersBalance(ownerId, containers);

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        // The list of currency ids that are present in `containerBalances`
        const relevantCurrencyIds = Array.from((() =>
        {
            const currencyIds: string[] = [];
            for (const [_, balances] of Object.entries(containerBalances))
                currencyIds.push(...Object.keys(balances));
            return new Set([...currencyIds]);
        })());

        const relevantCurrencies = ServiceUtils.reverseMap
        (
            await Promise.all(relevantCurrencyIds.map
            (
                async cId =>
                {
                    return [cId, (await currRepo.findCurrencyByIdNameTickerOne(
                        ownerId,
                        cId,
                        QUERY_IGNORE,
                        QUERY_IGNORE,
                        currencyCache
                    ))!];
                }
            ))
        );

        // The mapping between each currency and its rate at the given date.
        const ratesAtGivenEpoch = await (async () =>
        {
            const output: { [currencyId: string]: Decimal } = {};
            for (const currencyId of relevantCurrencyIds)
            {
                output[currencyId] = unwrap(await CurrencyCalculator.currencyToBaseRate
                (
                    ownerId,
                    {
                        id: relevantCurrencies[currencyId].id,
                        isBase: relevantCurrencies[currencyId].isBase!,
                        fallbackRateAmount: relevantCurrencies[currencyId].fallbackRateAmount,
                        fallbackRateCurrencyId: relevantCurrencies[currencyId].fallbackRateCurrencyId
                    },
                    innerRateEpoch,
                    currencyRateDatumsCache,
                    currencyToBaseRateCache,
                    currencyCache
                ));
            }
            return output;
        })();

        const containerValues: { [containerId: string]: Decimal } = (() =>
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