import createHttpError from "http-errors";
import { ContainerRepository } from "../repositories/container.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { ContainerService } from "./container.service.js";
import { CurrencyService } from "./currency.service.js";
import { TransactionTypeRepository } from "../repositories/transactionType.repository.js";
import { TransactionTypeService } from "./transactionType.service.js";
import { UserService } from "./user.service.js";

export class TransactionService
{
    public static async createTransaction
    (
        userId: string,
        obj: 
        {
            title: string,
            creationDate: Date,
            description: string,
            fromAmount?: string,
            fromContainerId?: string,
            fromCurrencyId?: string,
            toAmount?: string | undefined,
            toContainerId?: string | undefined,
            toCurrencyId?: string | undefined,
            typeId: string 
        }
    )
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
                throw createHttpError(404, `Cannot find container with id ${obj.fromContainerId}`);
            newTxn.fromContainer = container.container;
        }
        if (obj.fromCurrencyId)
        {
            const currency = await CurrencyService.getCurrency(userId,{ id: obj.fromCurrencyId });
            newTxn.fromCurrency = currency;
        }

        if (obj.toAmount) newTxn.toAmount = obj.toAmount;
        if (obj.toContainerId)
        {
            const container = await ContainerService.tryGetContainerById(userId, obj.toContainerId);
            if (!container.containerFound)
                throw createHttpError(404, `Cannot find container with id ${obj.toContainerId}`);
            newTxn.toContainer = container.container;
        }
        if (obj.toCurrencyId)
        {
            const currency = await CurrencyService.getCurrency(userId,{ id: obj.toCurrencyId });
            newTxn.toCurrency = currency;
        }

        if (!obj.fromAmount && !obj.toAmount) throw createHttpError(400, `From amount and toAmount cannot be both undefined.`);
        if (obj.fromAmount && (!obj.fromContainerId || !obj.fromCurrencyId)) throw createHttpError(400, `If fromAmount is given, fromContainerId and fromCurrencyId must also be defined.`);
        if (obj.toAmount && (!obj.toContainerId || !obj.toCurrencyId)) throw createHttpError(400, `If toAmount is given, toContainerId and toCurrencyId must also be defined.`);

        const owner = await UserService.getUserById(userId);
        if (!owner) throw createHttpError(`Cannot find user with id ${userId}`);
        newTxn.owner = owner;

        const txnType = await TransactionTypeService.getTransactionTypeById(userId, obj.typeId);
        newTxn.txnType = txnType;

        return await TransactionRepository.getInstance().save(newTxn);
    }

    // public static async getAllTransactions(userId: string)
    // {
    //     return await TransactionRepository.getInstance()
    //     .createQueryBuilder(`txn`)
    //     .where("ownerId = :ownerId", { ownerId: userId })
    //     .getMany();
    // }

    // public static async countAllTransactions(userId: string)
    // {
    //     return await TransactionRepository.getInstance()
    //     .createQueryBuilder(`txn`)
    //     .where("ownerId = :ownerId", { ownerId: userId })
    //     .getCount();
    // }

    public static async getTransactions
    (
        userId: string, config: 
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            title?: string,
            id?: string,
            description?: string
        }
    )
    {
        let query = TransactionRepository.getInstance()
        .createQueryBuilder(`txn`)
        .orderBy('txn.creationDate')
        .loadAllRelationIds()
        .where("ownerId = :ownerId", { ownerId: userId });

        if (config.startIndex !== undefined)
            query = query.skip(config.startIndex);

        if (config.endIndex !== undefined)
            query = query.take(config.endIndex);

        if (config.title !== undefined)
            query = query.where('txn.title LIKE :title', { title: `%${config.title}%` })

        if (config.description !== undefined)
            query = query.where('txn.description LIKE :description', { description: `%${config.description}%` })

        const queryResult = await query.getManyAndCount();

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0],
        }
    }
}