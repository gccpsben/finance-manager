import { TransactionTypeRepository as TransactionTagRepository } from "../repositories/txnTag.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TxnTag } from "../entities/txnTag.entity.js";
import { ServiceUtils } from "../servicesUtils.js";
import type { SQLitePrimitiveOnly } from "../../index.d.js";
import { MonadError } from "../../std_errors/monadError.js";
import { UserNotFoundError } from "./user.service.js";

const nameofT = (x: keyof TxnTag) => x;

export class TxnTagNotFoundError extends MonadError<typeof TxnTagNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public txnTagNameOrId: { id: string, name?: never } | { name: string, id?: never };
    public userId: string;

    constructor(txnTagNameOrId: { id: string, name?: never } | { name: string, id?: never }, userId: string)
    {
        if ("id" in txnTagNameOrId)
            super(TxnTagNotFoundError.ERROR_SYMBOL, `Cannot find the given txn tag with id = ${txnTagNameOrId.id}`);
        else
            super(TxnTagNotFoundError.ERROR_SYMBOL, `Cannot find the given txn tag with name = ${(txnTagNameOrId as {name: string}).name}`);

        this.name = this.constructor.name;
        this.txnTagNameOrId = txnTagNameOrId;
        this.userId = userId;
    }
}

export class TxnTagExistsError extends MonadError<typeof TxnTagExistsError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public txnTagName: string;
    public userId: string;

    constructor(txnTagName: string, userId: string)
    {
        super(TxnTagExistsError.ERROR_SYMBOL, `The given txn tag with name "${txnTagName}" already exists for user id="${userId}".`);
        this.name = this.constructor.name;
        this.txnTagName = txnTagName;
        this.userId = userId;
    }
}

export class TransactionTagService
{
    public static async createTxnTag(ownerId: string, name: string)
    {
        const tagWithSameName = await TransactionTagService.tryGetTxnTagByName(ownerId, name);
        if (tagWithSameName.found) return new TxnTagExistsError(name, ownerId);
        const owner = await UserRepository.getInstance().findOne({ where: { id: ownerId } });
        if (owner === null) return new UserNotFoundError(ownerId);
        const newTag = TransactionTagRepository.getInstance().create();
        newTag.name = name;
        newTag.owner = owner;
        return await TransactionTagRepository.getInstance().save(newTag);
    }

    public static async getTxnTagById(ownerId: string, id: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) return new UserNotFoundError(ownerId);

        const result = await TransactionTagRepository.getInstance()
        .createQueryBuilder(`tag`)
        .where(`tag.${nameofT('id')} = :id AND tag.${nameofT('ownerId')} = :ownerId`, { id: id, ownerId: ownerId })
        .getOne();

        if (!result || !id) return new TxnTagNotFoundError({id: id}, ownerId);
        return result;
    }

    public static async getUserTxnTags
    (
        ownerId: string,
        config:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            name?: string,
            id?: string,
        }
    ): Promise<{ totalCount: number, rangeItems: SQLitePrimitiveOnly<TxnTag>[] } | UserNotFoundError>
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) return new UserNotFoundError(ownerId);

        let query = TransactionTagRepository.getInstance()
        .createQueryBuilder(`tag`)
        .where(`tag.${nameofT('ownerId')} = :ownerId`, {ownerId: ownerId });

        if (config.name !== undefined) query = query.andWhere(`tag.${nameofT('name')} LIKE :name`, { title: `%${config.name}%` })

        query = ServiceUtils.paginateQuery(query, config);
        const queryResult = await query.getManyAndCount();

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0],
        };
    }

    public static async getTxnTagByName(ownerId: string, name: string)
    {
        const result = await this.tryGetTxnTagByName(ownerId, name);
        if (!result.found) return new TxnTagNotFoundError({ name: name }, ownerId);
        return result.obj;
    }

    public static async tryGetTxnTagByName(ownerId: string, name: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) throw new UserNotFoundError(ownerId);

        const result = await TransactionTagRepository.getInstance()
        .createQueryBuilder(`type`)
        .where(`type.${nameofT('name')} = :name AND type.${nameofT('ownerId')} = :ownerId`, { name: name, ownerId: ownerId })
        .getOne();

        return {
            found: !!result,
            obj: result as TxnTag | null
        };
    }
}