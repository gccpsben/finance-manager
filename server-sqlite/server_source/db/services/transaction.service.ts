import createHttpError from "http-errors";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { ContainerService } from "./container.service.js";
import { CurrencyService } from "./currency.service.js";
import { TransactionTypeService } from "./transactionType.service.js";
import { UserService } from "./user.service.js";
import { Transaction } from "../entities/transaction.entity.js";
import { Decimal } from "decimal.js";
import type { SQLitePrimitiveOnly } from "../../index.d.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { Container } from "../entities/container.entity.js";
import { isNullOrUndefined } from "../../router/validation.js";

const nameofT = (x: keyof Transaction) => nameof<Transaction>(x);

export class TransactionService
{
    /**
     * Validate if a provided transaction is valid or not.
     * If not, throw a application-level HTTP error (not panic).
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
            toAmount?: string | undefined,
            toContainerId?: string | undefined,
            toCurrencyId?: string | undefined,
            txnTypeId: string
        } | Transaction
    ): Promise<{error: createHttpError.HttpError | undefined, createdTxn: Transaction | undefined}>
    {
        const newTxn = TransactionRepository.getInstance().create();
        newTxn.creationDate = obj.creationDate;
        newTxn.description = obj.description;

        newTxn.title = obj.title;
        if (obj.fromAmount) newTxn.fromAmount = obj.fromAmount;
        if (obj.fromContainerId)
        {
            const container = await ContainerService.tryGetContainerById(userId, obj.fromContainerId);
            if (!container.containerFound)
                return {
                    error: createHttpError(404, `Cannot find container with id ${obj.fromContainerId}`),
                    createdTxn: undefined
                };
            newTxn.fromContainer = container.container;
        }
        if (obj.fromCurrencyId)
        {
            const currency = await CurrencyService.getCurrencyWithoutCache(userId,{ id: obj.fromCurrencyId });
            newTxn.fromCurrency = currency;
        }

        if (obj.toAmount) newTxn.toAmount = obj.toAmount;
        if (obj.toContainerId)
        {
            const container = await ContainerService.tryGetContainerById(userId, obj.toContainerId);
            if (!container.containerFound)
                return {
                    error: createHttpError(404, `Cannot find container with id ${obj.toContainerId}`),
                    createdTxn: undefined
                };
            newTxn.toContainer = container.container;
        }
        if (obj.toCurrencyId)
        {
            const currency = await CurrencyService.getCurrencyWithoutCache(userId,{ id: obj.toCurrencyId });
            newTxn.toCurrency = currency;
        }

        if (!obj.fromAmount && !obj.toAmount)
            return { error:
                createHttpError(400, `"${nameofT('fromAmount')}" and ${nameofT('toAmount')} cannot be both undefined.`),
                createdTxn: undefined
            };
        if (obj.fromAmount && (!obj.fromContainerId || !obj.fromCurrencyId))
            return {
                error: createHttpError(400, `If "${nameofT('fromAmount')}" is given, ${nameofT('fromContainerId')} and ${nameofT('fromCurrencyId')} must also be defined.`),
                createdTxn: undefined
            }
        if (obj.toAmount && (!obj.toContainerId || !obj.toCurrencyId))
            return {
                error: createHttpError(400, `If ${nameofT('toAmount')} is given, ${nameofT('toContainerId')} and ${nameofT('toCurrencyId')} must also be defined.`),
                createdTxn: undefined
            }

        const owner = await UserService.getUserById(userId);
        if (!owner)
            return {
                error: createHttpError(`Cannot find user with id ${userId}`),
                createdTxn: undefined
            }

        newTxn.owner = owner;

        const txnType = await TransactionTypeService.getTransactionTypeById(userId, obj.txnTypeId);
        newTxn.txnType = txnType;

        return { error: undefined, createdTxn: newTxn };
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
        const oldTxn = await TransactionRepository.getInstance().findOne(
        {
            where:
            {
                id: targetTxnId ?? null,
                ownerId: userId ?? null
            }
        });
        if (!oldTxn) throw createHttpError(404, `Cannot find transaction with id '${targetTxnId}'`);

        // Modify old txn given input manually
        await (async () =>
        {
            oldTxn.title = obj.title;
            oldTxn.creationDate = obj.creationDate;
            oldTxn.description = obj.description;

            oldTxn.fromAmount = isNullOrUndefined(obj.fromAmount) ? null : obj.fromAmount;

            oldTxn.fromContainerId = obj.fromContainerId ?? null;
            oldTxn.fromContainer = !oldTxn.fromContainerId ? null : await ContainerService.getOneContainer(oldTxn.ownerId, { id: obj.fromContainerId });

            oldTxn.fromCurrencyId = obj.fromCurrencyId ?? null;
            oldTxn.fromCurrency = !oldTxn.fromCurrencyId ? null : await CurrencyService.getCurrencyByIdWithoutCache(oldTxn.ownerId, oldTxn.fromCurrencyId);

            oldTxn.toAmount = isNullOrUndefined(obj.toAmount) ? null : obj.toAmount;

            oldTxn.toContainerId = obj.toContainerId ?? null;
            oldTxn.toContainer = !oldTxn.toContainerId ? null : await ContainerService.getOneContainer(oldTxn.ownerId, { id: obj.toContainerId });

            oldTxn.toCurrencyId = obj.toCurrencyId ?? null;
            oldTxn.toCurrency = !oldTxn.toCurrencyId ? null : await CurrencyService.getCurrencyByIdWithoutCache(oldTxn.ownerId, oldTxn.toCurrencyId);

            oldTxn.txnTypeId = obj.txnTypeId ?? null;
            oldTxn.txnType = !oldTxn.txnTypeId ? null : await TransactionTypeService.getTransactionTypeById(oldTxn.ownerId, oldTxn.txnTypeId);
        })();

        const { error: error } = await TransactionService.validateTransaction(userId, oldTxn);
        if (error) throw error;

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
        if (newTxn.error) throw newTxn.error;
        return await TransactionRepository.getInstance().save(newTxn.createdTxn);
    }

    /**
     * Get the change in value of a transaction in base currency value.
     */
    public static async getTxnIncreaseInValue
    (
        userId: string,
        transaction: { fromAmount: string, toAmount:string, fromCurrencyId: string, toCurrencyId: string, creationDate: number },
        /** A mapping mapping each currency ID to its rate to base value. Will fetch from database if not given, or the currency is not found */
        currencyToBaseValueMappingCache: {[key:string]: Decimal} | undefined = undefined
    ): Promise<{ increaseInValue: Decimal, currencyBaseValMapping: {[key:string]: Decimal} }>
    {
        let mapping = !currencyToBaseValueMappingCache ? { } : { ...currencyToBaseValueMappingCache };

        const amountToBaseValue = async (amount: string, currencyId: string) =>
        {
            let currencyRate = mapping[currencyId];
            if (!currencyRate)
            {
                const currencyRefetched = await CurrencyService.getCurrencyWithoutCache(userId, { id: currencyId });
                const rate =
                (
                    await CurrencyService.rateHydrateCurrency
                    (
                        userId,
                        currencyRefetched,
                        transaction.creationDate
                    )
                ).rateToBase;
                currencyRate = new Decimal(rate);
                mapping[currencyId] = currencyRate;
            }
            return new Decimal(amount).mul(currencyRate);
        };

        if (transaction.fromAmount !== null && transaction.toAmount === null)
        {
            return {
                increaseInValue:  (await amountToBaseValue(transaction.fromAmount, transaction.fromCurrencyId)).neg(),
                currencyBaseValMapping: mapping
            }
        }

        if (transaction.fromAmount === null && transaction.toAmount !== null)
        {
            return {
                increaseInValue: await amountToBaseValue(transaction.toAmount, transaction.toCurrencyId),
                currencyBaseValMapping: mapping
            }
        }

        return {
            increaseInValue: (await amountToBaseValue(transaction.toAmount, transaction.toCurrencyId)).sub(await amountToBaseValue(transaction.fromAmount, transaction.fromCurrencyId)),
            currencyBaseValMapping: mapping
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
    ): Promise<{ totalCount: number, rangeItems: SQLitePrimitiveOnly<Transaction>[] }>
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

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0],
        };
    }

    public static async getUserEarliestTransaction(userId: string): Promise<SQLitePrimitiveOnly<Transaction> | undefined>
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

    public static async getContainersTransactions(userId: string, containerIds: string[] | SQLitePrimitiveOnly<Container>[])
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