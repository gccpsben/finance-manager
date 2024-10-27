import createHttpError from "http-errors";
import { TransactionTypeRepository } from "../repositories/transactionType.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TransactionType } from "../entities/transactionType.entity.js";
import { ServiceUtils } from "../servicesUtils.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { MonadError } from "../../stdErrors/monadError.js";
import { UserNotFoundError } from "./user.service.js";

const nameofT = (x: keyof TransactionType) => x;

export class TxnTypeExistsError extends MonadError<typeof TxnTypeExistsError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public txnTypeName: string;
    public userId: string;

    constructor(txnTypeName: string, userId: string)
    {
        super(TxnTypeExistsError.ERROR_SYMBOL, `The given txn type with name "${txnTypeName}" already exists for user id="${userId}".`);
        this.name = this.constructor.name;
        this.txnTypeName = txnTypeName;
        this.userId = userId;
    }
}

export class TransactionTypeService
{
    public static async createTransactionType(ownerId: string, name: string)
    {
        const typeWithSameName = await TransactionTypeService.tryGetTransactionTypeByName(ownerId, name);
        if (typeWithSameName.found)
            return new TxnTypeExistsError(name, ownerId);

        const newType = TransactionTypeRepository.getInstance().create();
        newType.name = name;
        newType.owner = await UserRepository.getInstance().findOne({ where: { id: ownerId } });
        return await TransactionTypeRepository.getInstance().save(newType);
    }

    public static async getTransactionTypeById(ownerId: string, id: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) return new UserNotFoundError(ownerId);

        const result = await TransactionTypeRepository.getInstance()
        .createQueryBuilder(`type`)
        .where(`type.${nameofT('id')} = :id AND type.${nameofT('ownerId')} = :ownerId`, { id: id, ownerId: ownerId })
        .getOne();

        if (!result || !id) throw createHttpError(404, `Cannot find transaction type with id "${id}"`);
        return result;
    }

    public static async getUserTransactionTypes
    (
        ownerId: string,
        config:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            name?: string,
            id?: string,
        }
    ): Promise<{ totalCount: number, rangeItems: SQLitePrimitiveOnly<TransactionType>[] } | UserNotFoundError>
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) return new UserNotFoundError(ownerId);

        let query = TransactionTypeRepository.getInstance()
        .createQueryBuilder(`type`)
        .where(`type.${nameofT('ownerId')} = :ownerId`, {ownerId: ownerId });

        if (config.name !== undefined) query = query.andWhere(`type.${nameofT('name')} LIKE :name`, { title: `%${config.name}%` })

        query = ServiceUtils.paginateQuery(query, config);
        const queryResult = await query.getManyAndCount();

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0],
        };
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
        .where(`type.${nameofT('name')} = :name AND type.${nameofT('ownerId')} = :ownerId`, { name: name, ownerId: ownerId })
        .getOne();

        return {
            found: !!result,
            obj: result as TransactionType | null
        };
    }
}