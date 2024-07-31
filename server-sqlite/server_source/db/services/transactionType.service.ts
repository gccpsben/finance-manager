import createHttpError from "http-errors";
import { TransactionTypeRepository } from "../repositories/transactionType.repository.js";
import { UserRepository } from "../repositories/user.repository.js";

export class TransactionTypeService
{
    public static async createTransactionType(ownerId: string, name: string)
    {
        const typeWithSameName = await TransactionTypeRepository.getInstance()
        .findOne(
        { 
            where: { owner: { id: ownerId }, name: name },
            relations: { owner: true }
        });

        if (typeWithSameName)
            throw createHttpError(400, `Transaction Type with name '${name}' already exists.`);

        const newType = TransactionTypeRepository.getInstance().create();
        newType.name = name;
        newType.owner = await UserRepository.getInstance().findOne({ where: { id: ownerId } });
        return await TransactionTypeRepository.getInstance().save(newType);
    }
}