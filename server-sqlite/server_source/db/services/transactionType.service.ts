import createHttpError from "http-errors";
import { TransactionTypeRepository } from "../repositories/transactionType.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TransactionType } from "../entities/transactionType.entity.js";

export class TransactionTypeService
{
    public static async createTransactionType(ownerId: string, name: string)
    {
        const typeWithSameName = await TransactionTypeService.tryGetTransactionTypeByName(ownerId, name);
        if (typeWithSameName.found)
            throw createHttpError(400, `Transaction Type with name '${name}' already exists.`);

        const newType = TransactionTypeRepository.getInstance().create();
        newType.name = name;
        newType.owner = await UserRepository.getInstance().findOne({ where: { id: ownerId } });
        return await TransactionTypeRepository.getInstance().save(newType);
    }

    public static async getTransactionTypeById(ownerId: string, id: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) throw createHttpError(404, `Cannot find user with id '${ownerId}'`);

        const result = await TransactionTypeRepository.getInstance()
        .createQueryBuilder(`type`)
        .where(`type.id = :id AND type.ownerId = :ownerId`, { id: id, ownerId: ownerId })
        .getOne();

        if (!result || !id) throw createHttpError(404, `Cannot find transaction type with id "${id}"`);
        return result;
    }

    public static async getUserTransactionTypes(ownerId: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) throw createHttpError(404, `Cannot find user with id '${ownerId}'`);

        const results = await TransactionTypeRepository.getInstance()
        .createQueryBuilder(`type`)
        .where(`type.ownerId = :ownerId`, {ownerId: ownerId })
        .getMany();

        return results;
    }

    public static async getTransactionTypeByName(ownerId: string, name: string)
    {
        const result = await this.tryGetTransactionTypeByName(ownerId, name);
        if (!result.found) throw createHttpError(404, `Cannot find transaction type with name "${name}"`);
        return result.obj;
    }

    public static async tryGetTransactionTypeByName(ownerId: string, name: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) throw createHttpError(404, `Cannot find user with id '${ownerId}'`);

        const result = await TransactionTypeRepository.getInstance()
        .createQueryBuilder(`type`)
        .where(`type.name = :name AND type.ownerId = :ownerId`, { name: name, ownerId: ownerId })
        .getOne();

        return {
            found: !!result,
            obj: result as TransactionType | null
        };
    }
}