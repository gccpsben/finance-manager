import { ContainerNotFoundError } from "./container.service.js";
import { CurrencyNotFoundError, CurrencyService } from "./currency.service.js";
import { TransactionTagService, TxnTagNotFoundError } from "./txnTag.service.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { Transaction } from "../entities/transaction.entity.js";
import { Decimal } from "decimal.js";
import type { PartialNull } from "../../index.d.js";
import { nameof } from "../servicesUtils.js";
import { MonadError } from "../../std_errors/monadError.js";
import { TxnTag } from "../entities/txnTag.entity.js";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { Database } from "../db.js";
import { CurrencyCache } from "../caches/currencyListCache.cache.js";
import { CurrencyRateDatumsCache } from '../caches/currencyRateDatumsCache.cache.js';

export class TxnMissingContainerOrCurrency extends MonadError<typeof TxnMissingFromToAmountError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super
        (
            TxnMissingFromToAmountError.ERROR_SYMBOL,
            `If "${nameofT('fromAmount')}" is given, ${nameofT('fromContainerId')} and ${nameofT('fromCurrencyId')} must also be defined, same for to variant.`
        );
        this.name = this.constructor.name;
    }
}

export class TxnMissingFromToAmountError extends MonadError<typeof TxnMissingFromToAmountError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(TxnMissingFromToAmountError.ERROR_SYMBOL, `"${nameofT('fromAmount')}" and ${nameofT('toAmount')} cannot be both undefined.`);
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
    fromAmount: string | null,
    fromContainerId: string | null,
    fromCurrencyId: string | null,
    fromCurrency: null | TransactionJSONQueryCurrency,
    id: string,
    toAmount: string | null,
    toContainerId: string | null,
    toCurrency: null | TransactionJSONQueryCurrency,
    tagIds: string[]
}

const nameofT = (x: keyof Transaction) => nameof<Transaction>(x);

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
            fromAmount?: string,
            fromContainerId?: string,
            fromCurrencyId?: string,
            toAmount?: string | null,
            toContainerId?: string | null,
            toCurrencyId?: string | null,
            txnTagIds: string[]
        },
        currencyListCache: CurrencyCache | null
    ): Promise<
        Transaction |
        UserNotFoundError |
        TxnTagNotFoundError |
        ContainerNotFoundError |
        TxnMissingFromToAmountError |
        TxnMissingContainerOrCurrency |
        CurrencyNotFoundError
    >
    {
        // NOTICE when using TypeORM's `save` method.
        // All undefined properties will be skipped.

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const currRepo = Database.getCurrencyRepository()!;

        const newTxn: PartialNull<Omit<Transaction, 'validate' | 'id'>> = {
            title: null,
            description: null,
            ownerId: null,
            owner: null,
            creationDate: null,
            tags: null,
            fromAmount: null,
            fromCurrencyId: null,
            fromCurrency: null,
            fromContainerId: null,
            fromContainer: null,
            toAmount: null,
            toCurrencyId: null,
            toCurrency: null,
            toContainerId: null,
            toContainer: null
        };
        newTxn.creationDate = obj.creationDate;
        newTxn.description = obj.description;

        newTxn.title = obj.title;

        // From Amount
        {
            if (obj.fromAmount) newTxn.fromAmount = obj.fromAmount;
            if (obj.fromContainerId)
            {
                const container = await Database.getContainerRepository()!.getContainer(userId, obj.fromContainerId, QUERY_IGNORE);
                if (!container) return new ContainerNotFoundError(obj.fromContainerId, userId);
                newTxn.fromContainerId = container.id;
            }
            if (obj.fromCurrencyId)
            {
                const currency = await currRepo.findCurrencyByIdNameTickerOne(userId, obj.fromCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyListCache);
                if (!currency) return new CurrencyNotFoundError(obj.fromCurrencyId, userId);
                newTxn.fromCurrencyId = obj.fromCurrencyId;
            }
        }

        // To Amount
        {
            if (obj.toAmount) newTxn.toAmount = obj.toAmount;
            else newTxn.toAmount = null;

            if (obj.toContainerId)
            {
                const container = await Database.getContainerRepository()!.getContainer(userId, obj.toContainerId, QUERY_IGNORE);
                if (!container) return new ContainerNotFoundError(obj.toContainerId, userId);
                newTxn.toContainerId = container.id;
            }
            else { newTxn.toContainerId = null; newTxn.toContainer = null; }

            if (obj.toCurrencyId)
            {
                const currency = await currRepo.findCurrencyByIdNameTickerOne(userId, obj.toCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyListCache);
                if (!currency) return new CurrencyNotFoundError(obj.toCurrencyId, userId);
                newTxn.toCurrencyId = obj.toCurrencyId;
            }
            else { newTxn.toCurrencyId = null; newTxn.toCurrency = null; }
        }

        if (!obj.fromAmount && !obj.toAmount) return new TxnMissingFromToAmountError();
        if (obj.fromAmount && (!obj.fromContainerId || !obj.fromCurrencyId)) return new TxnMissingContainerOrCurrency();
        if (obj.toAmount && (!obj.toContainerId || !obj.toCurrencyId)) return new TxnMissingContainerOrCurrency();

        const owner = await UserService.getUserById(userId);
        if (!owner) return new UserNotFoundError(userId);

        newTxn.owner = owner;

        const tnxTagObjs: TxnTag[] = [];
        for (const txnTagId of obj.txnTagIds)
        {
            const txnTag = await TransactionTagService.getTxnTagById(userId, txnTagId);
            if (txnTag instanceof UserNotFoundError) return txnTag;
            if (txnTag instanceof TxnTagNotFoundError) return txnTag;
            tnxTagObjs.push(txnTag);
        }

        newTxn.tags = tnxTagObjs;

        // @ts-ignore
        // TODO: fix id null mismatch
        return newTxn;
    }

    public static getTxnValueIncreaseRaw
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
            fromAmount?: string | null | undefined,
            toAmount?:string | null | undefined,
            fromCurrencyId?: string | null | undefined,
            toCurrencyId?: string | null | undefined,
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
            increaseInValue: this.getTxnValueIncreaseRaw(
                !!transaction.fromCurrencyId && !!transaction.fromAmount ? {
                    amount: transaction.fromAmount,
                    rate: await getRate(transaction.fromCurrencyId)
                } : null,
                !!transaction.toCurrencyId && !!transaction.toAmount ? {
                    amount: transaction.toAmount ,
                    rate: await getRate(transaction.toCurrencyId)
                } : null
            )
        }
    }
}