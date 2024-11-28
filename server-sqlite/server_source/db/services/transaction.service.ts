import { TransactionRepository } from "../repositories/transaction.repository.js";
import { ContainerNotFoundError, ContainerService } from "./container.service.js";
import { CurrencyService } from "./currency.service.js";
import { TransactionTypeService, TxnTypeNotFoundError } from "./transactionType.service.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { Transaction } from "../entities/transaction.entity.js";
import { Decimal } from "decimal.js";
import type { PartialNull, SQLitePrimitiveOnly } from "../../index.d.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { isNullOrUndefined } from "../../router/validation.js";
import { MonadError, panic, unwrap } from "../../std_errors/monadError.js";

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
            txnTypeId: string
        } | Transaction
    ): Promise<
        Transaction |
        UserNotFoundError |
        TxnTypeNotFoundError |
        ContainerNotFoundError |
        TxnMissingFromToAmountError |
        TxnMissingContainerOrCurrency
    >
    {
        // NOTICE when using TypeORM's `save` method.
        // All undefined properties will be skipped.

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const newTxn: PartialNull<Transaction> = TransactionRepository.getInstance().create();
        newTxn.creationDate = obj.creationDate;
        newTxn.description = obj.description;

        newTxn.title = obj.title;
        if (obj.fromAmount) newTxn.fromAmount = obj.fromAmount;
        if (obj.fromContainerId)
        {
            const container = await ContainerService.tryGetContainerById(userId, obj.fromContainerId);
            if (!container.containerFound) return new ContainerNotFoundError(obj.fromContainerId, userId);
            newTxn.fromContainer = container.container;
        }
        if (obj.fromCurrencyId)
        {
            const currency = unwrap(await CurrencyService.getCurrencyWithoutCache(userId,{ id: obj.fromCurrencyId }));
            newTxn.fromCurrency = currency;
        }

        // To Amount
        {
            if (obj.toAmount) newTxn.toAmount = obj.toAmount;
            else newTxn.toAmount = null;

            if (obj.toContainerId)
            {
                const container = await ContainerService.tryGetContainerById(userId, obj.toContainerId);
                if (!container.containerFound) return new ContainerNotFoundError(obj.toContainerId, userId);
                newTxn.toContainer = container.container;
            }
            else { newTxn.toContainerId = null; newTxn.toContainer = null; }

            if (obj.toCurrencyId)
            {
                const currency = unwrap(await CurrencyService.getCurrencyWithoutCache(userId,{ id: obj.toCurrencyId }));
                newTxn.toCurrency = currency;
            }
            else { newTxn.toCurrencyId = null; newTxn.toCurrency = null; }
        }

        if (!obj.fromAmount && !obj.toAmount) return new TxnMissingFromToAmountError();
        if (obj.fromAmount && (!obj.fromContainerId || !obj.fromCurrencyId)) return new TxnMissingContainerOrCurrency();
        if (obj.toAmount && (!obj.toContainerId || !obj.toCurrencyId)) return new TxnMissingContainerOrCurrency();

        const owner = await UserService.getUserById(userId);
        if (!owner) return new UserNotFoundError(userId);

        newTxn.owner = owner;

        const txnType = await TransactionTypeService.getTransactionTypeById(userId, obj.txnTypeId);
        if (txnType instanceof UserNotFoundError) return txnType;
        if (txnType instanceof TxnTypeNotFoundError) return txnType;

        newTxn.txnType = txnType;

        // @ts-ignore
        // TODO: fix id null mismatch
        return newTxn;
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
            fromAmount?: string,
            fromContainerId?: string,
            fromCurrencyId?: string,
            toAmount?: string | undefined,
            toContainerId?: string | undefined,
            toCurrencyId?: string | undefined,
            txnTypeId: string
        }
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const oldTxn = await TransactionRepository.getInstance().findOne(
        {
            where:
            {
                id: targetTxnId ?? null,
                ownerId: userId ?? null
            }
        });

        if (!oldTxn) return new TxnNotFoundError(targetTxnId, userId);

        // Modify old txn given input manually
        {
            oldTxn.title = obj.title;
            oldTxn.creationDate = obj.creationDate;
            oldTxn.description = obj.description;

            oldTxn.fromAmount = isNullOrUndefined(obj.fromAmount) ? null : obj.fromAmount;

            oldTxn.fromContainerId = obj.fromContainerId ?? null;
            oldTxn.fromContainer = !oldTxn.fromContainerId ? null : await ContainerService.getOneContainer(oldTxn.ownerId, { id: obj.fromContainerId });

            oldTxn.fromCurrencyId = obj.fromCurrencyId ?? null;
            oldTxn.fromCurrency = !oldTxn.fromCurrencyId ? null : unwrap(await CurrencyService.getCurrencyByIdWithoutCache
            (
                oldTxn.ownerId,
                oldTxn.fromCurrencyId
            ));

            oldTxn.toAmount = isNullOrUndefined(obj.toAmount) ? null : obj.toAmount;

            oldTxn.toContainerId = obj.toContainerId ?? null;
            oldTxn.toContainer = !oldTxn.toContainerId ? null : await ContainerService.getOneContainer(oldTxn.ownerId, { id: obj.toContainerId });

            oldTxn.toCurrencyId = obj.toCurrencyId ?? null;
            oldTxn.toCurrency = !oldTxn.toCurrencyId ? null : unwrap(await CurrencyService.getCurrencyByIdWithoutCache
            (
                oldTxn.ownerId,
                oldTxn.toCurrencyId
            ));

            {
                oldTxn.txnTypeId = obj.txnTypeId ?? null;
                if (!!oldTxn.txnTypeId)
                {
                    const oldTxnType = await TransactionTypeService.getTransactionTypeById(oldTxn.ownerId, oldTxn.txnTypeId);
                    if (oldTxnType instanceof UserNotFoundError) return oldTxnType;
                    if (oldTxnType instanceof TxnTypeNotFoundError) return oldTxnType;
                    oldTxn.txnType = oldTxnType;
                }
                else { oldTxn.txnType = null; }
            }
        }

        const txnValidationResults = await TransactionService.validateTransaction(userId, oldTxn);
        if (txnValidationResults instanceof UserNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof TxnTypeNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof ContainerNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof TxnMissingFromToAmountError) return txnValidationResults;
        if (txnValidationResults instanceof TxnMissingContainerOrCurrency) return txnValidationResults;

        return await TransactionRepository.getInstance().save(oldTxn);
    }

    public static async createTransaction
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
            toAmount?: string | undefined,
            toContainerId?: string | undefined,
            toCurrencyId?: string | undefined,
            txnTypeId: string
        }
    )
    {
        const newTxn = await TransactionService.validateTransaction(userId, obj);
        if (newTxn instanceof UserNotFoundError) return newTxn;
        if (newTxn instanceof TxnTypeNotFoundError) return newTxn;
        if (newTxn instanceof TxnMissingFromToAmountError) return newTxn;
        if (newTxn instanceof ContainerNotFoundError) return newTxn;
        if (newTxn instanceof TxnMissingContainerOrCurrency) return newTxn;
        const savedObj = await TransactionRepository.getInstance().save(newTxn);

        if (!savedObj.id)
            throw panic(`Saved rows in the database still got falsy IDs`);

        // Id will always be defined since we saved the obj.
        return savedObj as (typeof savedObj & { id: string });
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
    ): Promise<{ increaseInValue: Decimal } | UserNotFoundError>
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const amountToBaseValue = async (amount: string, currencyId: string) =>
        {
            let currencyRate: Decimal;
            const currencyRefetched = unwrap(await CurrencyService.getCurrencyWithoutCache(userId, { id: currencyId }));
            const rate =
            (
                await CurrencyService.rateHydrateCurrency
                (
                    userId,
                    [currencyRefetched!],
                    transaction.creationDate
                )
            )[0].rateToBase;
            currencyRate = new Decimal(rate);

            return new Decimal(amount).mul(currencyRate);
        };

        if (transaction.fromAmount && transaction.toAmount === null && transaction.fromCurrencyId)
        {
            return {
                increaseInValue:  (await amountToBaseValue(transaction.fromAmount, transaction.fromCurrencyId)).neg(),
            }
        }

        if (transaction.fromAmount === null && transaction.toAmount && transaction.toCurrencyId)
        {
            return {
                increaseInValue: await amountToBaseValue(transaction.toAmount, transaction.toCurrencyId),
            }
        }

        return {
            increaseInValue: (await amountToBaseValue(transaction.toAmount!, transaction.toCurrencyId!))
                .sub(await amountToBaseValue(transaction.fromAmount!, transaction.fromCurrencyId!)),
        };
    }

    public static async getTransactions
    (
        userId: string,
        config:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            startDate?: number | undefined, endDate?: number | undefined,
            title?: string,
            id?: string,
            description?: string
        } | undefined = undefined
    ): Promise<{ totalCount: number, rangeItems: SQLitePrimitiveOnly<Transaction & { id: string }>[] }>
    {
        let query = TransactionRepository.getInstance()
        .createQueryBuilder(`txn`)
        .orderBy(`txn.${nameofT('creationDate')}`, "DESC")
        .where(`${nameofT('ownerId')} = :ownerId`, { ownerId: userId });

        if (config?.id !== undefined)
            query = query.andWhere(`txn.${nameofT('id')} == :target_id`, {target_id: `${config.id}`});

        if (config?.title !== undefined)
            query = query.andWhere(`txn.${nameofT('title')} LIKE :title`, { title: `%${config.title}%` });

        if (config?.description !== undefined)
            query = query.andWhere(`txn.${nameofT('description')} LIKE :description`, { description: `%${config.description}%` });

        if (config?.startDate)
            query = query.andWhere(`${nameofT('creationDate')} >= :startDate`, { startDate: config.startDate });

        if (config?.endDate)
            query = query.andWhere(`${nameofT('creationDate')} <= :endDate`, { endDate: config.endDate });

        query = ServiceUtils.paginateQuery(query, config ?? {});

        const queryResult = await query.getManyAndCount();

        // Check if id are all defined.
        if (queryResult[0].some(x => !x.id))
            throw panic(`Some of the transactions queried from database has falsy primary keys.`);

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0].map(x => ({
                ...x,
                id: x.id!
            })),
        };
    }

    public static async getUserEarliestTransaction(userId: string): Promise<SQLitePrimitiveOnly<Transaction> | null>
    {
        const nameofT = (x: keyof Transaction) => nameof<Transaction>(x);

        let query = await TransactionRepository.getInstance()
        .createQueryBuilder(`txn`)
        .where(`${nameofT('ownerId')} = :ownerId`, { ownerId: userId ?? null })
        .orderBy(`txn.${nameofT('creationDate')}`, "ASC")
        .limit(1)
        .getOne();

        return query;
    }

    public static async getContainersTransactions(userId: string, containerIds: string[] | { id: string }[])
    {
        const targetContainerIds = ServiceUtils.normalizeEntitiesToIds(containerIds, 'id');

        let query = TransactionRepository.getInstance()
        .createQueryBuilder(`txn`)
        .where(`${nameofT('ownerId')} = :ownerId`, { ownerId: userId ?? null })
        .andWhere
        (
            /*sql*/`
                ${nameofT('fromContainerId')} IN (:...targetContainerIds)
                    OR
                ${nameofT('toContainerId')} IN (:...targetContainerIds)`,
            { targetContainerIds: targetContainerIds }
        );

        return await query.getMany() as SQLitePrimitiveOnly<Transaction>[];
    }
}