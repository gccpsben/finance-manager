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

        if (obj.fromAmount) newTxn.toAmount = obj.toAmount;
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
}