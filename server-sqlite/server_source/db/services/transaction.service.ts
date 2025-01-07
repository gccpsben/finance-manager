import { ContainerNotFoundError } from "./container.service.js";
import { CurrencyNotFoundError, CurrencyService } from "./currency.service.js";
import { TxnTagService, TxnTagNotFoundError } from "./txnTag.service.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { Decimal } from "decimal.js";
import { MonadError } from "../../std_errors/monadError.js";
import { TxnTag } from "../entities/txnTag.entity.js";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { Database } from "../db.js";
import { CurrencyCache } from "../caches/currencyListCache.cache.js";
import { CurrencyRateDatumsCache } from '../caches/currencyRateDatumsCache.cache.js';
import { FragmentRaw, nameofF } from "../entities/fragment.entity.js";
import { QueryRunner } from "typeorm";

export class FragmentMissingContainerOrCurrency extends MonadError<typeof FragmentMissingContainerOrCurrency.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super
        (
            FragmentMissingContainerOrCurrency.ERROR_SYMBOL,
            `If "${nameofF('fromAmount')}" is given, ${nameofF('fromContainerId')} and ${nameofF('fromCurrencyId')} must also be defined, same for to variant.`
        );
        this.name = this.constructor.name;
    }
}

export class TxnNoFragmentsError extends MonadError<typeof TxnNoFragmentsError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(TxnNoFragmentsError.ERROR_SYMBOL, `A transaction must have at least one fragment.`);
        this.name = this.constructor.name;
    }
}

export class FragmentMissingFromToAmountError extends MonadError<typeof FragmentMissingFromToAmountError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(FragmentMissingFromToAmountError.ERROR_SYMBOL, `"${nameofF('fromAmount')}" and ${nameofF('toAmount')} cannot be both undefined.`);
        this.name = this.constructor.name;
    }
}

export class TxnNotFoundError extends MonadError<typeof TxnNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public txnId: string;
    public userId: string;

    constructor(txnId: string, userId: string)
    {
        super(TxnNotFoundError.ERROR_SYMBOL, `Cannot find the given txn with id = ${txnId}`);
        this.name = this.constructor.name;
        this.txnId = txnId;
        this.userId = userId;
    }
}

export class JSONQueryError extends MonadError<typeof JSONQueryError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public jsonQuery: string;
    public queryErrorMessage: string;
    public userId: string;

    constructor(userId: string, queryErrorMessage: string, jsonQuery: string)
    {
        super(JSONQueryError.ERROR_SYMBOL, `The given query "${jsonQuery}" failed with message "${queryErrorMessage}"`);
        this.name = this.constructor.name;
        this.queryErrorMessage = queryErrorMessage;
        this.jsonQuery = jsonQuery;
        this.userId = userId;
    }
}

export type TransactionJSONQueryCurrency =
{
    fallbackRateAmount: string | null;
    fallbackRateCurrencyId: string | null;
    id: string;
    isBase: boolean;
    ticker: string;
};

export type TransactionJSONQueryItem =
{
    title: string,
    creationDate: number,
    description: string | null,
    id: string,
    tagIds: string[],
    // fromAmount: string | null,
    // fromContainerId: string | null,
    // fromCurrency: null | TransactionJSONQueryCurrency,
    // toAmount: string | null,
    // toContainerId: string | null,
    // toCurrency: null | TransactionJSONQueryCurrency,
    fragments: FragmentRaw[]
    excludedFromIncomesExpenses: boolean
}

export class TransactionService
{
    /**
     * Validate if a provided transaction is valid or not.
     * This returns an unsaved version of the txn.
     */
    public static async validateTransaction
    (
        userId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fragments: Omit<FragmentRaw, 'id'>[],
            txnTagIds: string[]
        },
        currencyListCache: CurrencyCache | null
    ): Promise<
        {
            title: string,
            creationDate: number,
            description: string,
            fragments: FragmentRaw[],
            txnTagIds: string[]
        } |
        UserNotFoundError |
        TxnTagNotFoundError |
        ContainerNotFoundError |
        FragmentMissingFromToAmountError |
        FragmentMissingContainerOrCurrency |
        TxnNoFragmentsError |
        CurrencyNotFoundError
    >
    {
        // ? NOTICE when using TypeORM's `save` method.
        // ? All undefined properties will be skipped.

        if (!obj.fragments?.length) return new TxnNoFragmentsError();

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const currRepo = Database.getCurrencyRepository()!;
        const contRepo = Database.getContainerRepository()!;

        // Validate each fragment
        for (const fragment of obj.fragments)
        {
            if (!fragment.fromAmount && !fragment.toAmount) return new FragmentMissingFromToAmountError();
            if (fragment.fromAmount && (!fragment.fromContainerId || !fragment.fromCurrencyId)) return new FragmentMissingContainerOrCurrency();
            if (fragment.toAmount && (!fragment.toContainerId || !fragment.toCurrencyId)) return new FragmentMissingContainerOrCurrency();

            // From Amount
            {
                if (fragment.fromContainerId)
                {
                    const container = await contRepo.getContainer(userId, fragment.fromContainerId, QUERY_IGNORE);
                    if (!container) return new ContainerNotFoundError(fragment.fromContainerId, userId);
                    // appliedFragment.fromContainerId = container.id;
                }
                if (fragment.fromCurrencyId)
                {
                    const currency = await currRepo.findCurrencyByIdNameTickerOne(userId, fragment.fromCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyListCache);
                    if (!currency) return new CurrencyNotFoundError(fragment.fromCurrencyId, userId);
                }
            }

            // To Amount
            {
                if (fragment.toContainerId)
                {
                    const container = await contRepo.getContainer(userId, fragment.toContainerId, QUERY_IGNORE);
                    if (!container) return new ContainerNotFoundError(fragment.toContainerId, userId);
                }

                if (fragment.toCurrencyId)
                {
                    const currency = await currRepo.findCurrencyByIdNameTickerOne(userId, fragment.toCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyListCache);
                    if (!currency) return new CurrencyNotFoundError(fragment.toCurrencyId, userId);
                }
            }
        }

        const owner = await UserService.getUserById(userId);
        if (!owner) return new UserNotFoundError(userId);

        const tnxTagObjs: { id: string; name: string; ownerId: string }[] = [];
        for (const txnTagId of obj.txnTagIds)
        {
            const txnTag = await TxnTagService.getTxnTagById(userId, txnTagId);
            if (txnTag instanceof UserNotFoundError) return txnTag;
            if (txnTag instanceof TxnTagNotFoundError) return txnTag;
            tnxTagObjs.push(txnTag);
        }

        return {
            title: obj.title,
            creationDate: obj.creationDate,
            description: obj.description,
            fragments: (obj.fragments ?? []).map(f => ({
                fromAmount: f.fromAmount,
                fromContainerId: f.fromContainerId,
                fromCurrencyId: f.fromCurrencyId,
                toAmount: f.toAmount,
                toContainerId: f.toContainerId,
                toCurrencyId: f.toCurrencyId
            })),
            txnTagIds: obj.txnTagIds
        };
    }

    public static getFragmentValueIncreaseRaw
    (
        from: { amount: string, rate: string } | null,
        to: { amount: string, rate: string } | null
    )
    {
        let fromValue: Decimal | null = null;
        let toValue: Decimal | null = null;

        if (from)
            fromValue = new Decimal(from.amount).mul(new Decimal(from.rate));
        if (to)
            toValue = new Decimal(to.amount).mul(new Decimal(to.rate));

        return (toValue ?? new Decimal('0')).sub(fromValue ?? new Decimal("0"));
    }

    /**
     * Get the change in value of a transaction in base currency value.
     */
    public static async getTxnIncreaseInValue
    (
        userId: string,
        transaction:
        {
            fragments: {
                fromAmount: string | null;
                fromContainerId: string | null;
                fromCurrencyId: string | null;
                toAmount: string | null;
                toContainerId: string | null;
                toCurrencyId: string | null;
            }[],
            creationDate: number
        },
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyListCache: CurrencyCache | null

    ): Promise<{ increaseInValue: Decimal } | UserNotFoundError>
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);
        const currRepo = Database.getCurrencyRepository()!;

        const getRate = async (currencyId: string) =>
        {
            let currencyRate = await (async () =>
            {
                // Try getting the currency rate to base at txn's epoch from cache first.
                const amountToBaseValueCacheResult = currencyToBaseRateCache?.queryCurrencyToBaseRate(userId, currencyId, transaction.creationDate);
                if (amountToBaseValueCacheResult) return amountToBaseValueCacheResult.toString();

                // If not available, compute the rate uncached. And finally save the result into cache.
                const currencyRefetched = await currRepo.findCurrencyByIdNameTickerOne
                (
                    userId,
                    currencyId,
                    QUERY_IGNORE,
                    QUERY_IGNORE,
                    currencyListCache
                );
                const rate =
                (
                    await CurrencyService.rateHydrateCurrency
                    (
                        userId,
                        [currencyRefetched!],
                        transaction.creationDate,
                        currencyRateDatumsCache,
                        currencyToBaseRateCache,
                        currencyListCache
                    )
                )[0].rateToBase;

                if (currencyToBaseRateCache)
                    currencyToBaseRateCache.cacheCurrencyToBase(userId, currencyRefetched!.id, transaction.creationDate, new Decimal(rate));

                return rate;
            })();

            return currencyRate;
        };

        return {
            increaseInValue: await (async () =>
            {
                let txnValueIncrease = new Decimal("0");
                for (const fragment of transaction.fragments)
                {
                    txnValueIncrease = txnValueIncrease.add(this.getFragmentValueIncreaseRaw(
                        !!fragment.fromCurrencyId && !!fragment.fromAmount ? {
                            amount: fragment.fromAmount,
                            rate: await getRate(fragment.fromCurrencyId)
                        } : null,
                        !!fragment.toCurrencyId && !!fragment.toAmount ? {
                            amount: fragment.toAmount ,
                            rate: await getRate(fragment.toCurrencyId)
                        } : null
                    ))
                }
                return txnValueIncrease;
            })()
        }
    }

    public static async createTransaction
    (
        userId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fragments: Omit<FragmentRaw, 'id'>[],
            txnTagIds: string[],
            excludedFromIncomesExpenses: boolean
        },
        queryRunner: QueryRunner,
        currencyListCache: CurrencyCache | null,

    )
    {
        const newTxn = await TransactionService.validateTransaction(userId, {
            creationDate: obj.creationDate,
            description: obj.description,
            fragments: obj.fragments,
            title: obj.title,
            txnTagIds: obj.txnTagIds
        }, currencyListCache);

        if (newTxn instanceof UserNotFoundError) return newTxn;
        if (newTxn instanceof TxnTagNotFoundError) return newTxn;
        if (newTxn instanceof FragmentMissingFromToAmountError) return newTxn;
        if (newTxn instanceof ContainerNotFoundError) return newTxn;
        if (newTxn instanceof FragmentMissingContainerOrCurrency) return newTxn;
        if (newTxn instanceof CurrencyNotFoundError) return newTxn;
        if (newTxn instanceof TxnNoFragmentsError) return newTxn;

        const savedTxn = await Database.getTransactionRepository()!.createTransaction(userId, {
            creationDate: newTxn.creationDate,
            description: newTxn.description,
            fragments: newTxn.fragments,
            title: newTxn.title,
            txnTagIds: newTxn.txnTagIds,
            excludedFromIncomesExpenses: obj.excludedFromIncomesExpenses
        }, queryRunner);

        if (savedTxn instanceof TxnTagNotFoundError) return savedTxn;

        return savedTxn;
    }

    public static async updateTransaction
    (
        userId: string,
        targetTxnId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fragments: Omit<FragmentRaw, 'id'>[],
            txnTagIds: string[],
            excludedFromIncomesExpenses: boolean
        },
        queryRunner: QueryRunner,
        currencyListCache: CurrencyCache | null
    )
    {
        const newTxn = await TransactionService.validateTransaction(userId, {
            creationDate: obj.creationDate,
            description: obj.description,
            fragments: obj.fragments,
            title: obj.title,
            txnTagIds: obj.txnTagIds
        }, currencyListCache);

        if (newTxn instanceof UserNotFoundError) return newTxn;
        if (newTxn instanceof TxnTagNotFoundError) return newTxn;
        if (newTxn instanceof FragmentMissingFromToAmountError) return newTxn;
        if (newTxn instanceof ContainerNotFoundError) return newTxn;
        if (newTxn instanceof FragmentMissingContainerOrCurrency) return newTxn;
        if (newTxn instanceof CurrencyNotFoundError) return newTxn;

        const savedTxn = await Database.getTransactionRepository()!.updateTransaction(userId, targetTxnId, {
            creationDate: obj.creationDate,
            description: obj.description,
            fragments: obj.fragments,
            tagIds: obj.txnTagIds,
            title: obj.title,
            excludedFromIncomesExpenses: obj.excludedFromIncomesExpenses
        }, queryRunner);
        return savedTxn;
    }
}