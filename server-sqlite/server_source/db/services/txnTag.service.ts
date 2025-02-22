import { TransactionTypeRepository as TxnTagRepository } from "../repositories/txnTag.repository.ts";
import { UserRepository } from "../repositories/user.repository.ts";
import { keyNameOfTxnTag } from "../entities/txnTag.entity.ts";
import { MonadError } from "../../std_errors/monadError.ts";
import { UserNotFoundError } from "./user.service.ts";
import { paginateQuery } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

export class TxnTagNotFoundError extends MonadError<typeof TxnTagNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public txnTagNameOrId: { id: string, name?: never } | { name: string, id?: never };
    public userId: string;

    constructor(txnTagNameOrId: { id: string, name?: never } | { name: string, id?: never }, userId: string)
    {
        super(
            TxnTagNotFoundError.ERROR_SYMBOL,
            "id" in txnTagNameOrId ? `Cannot find the given txn tag with id = ${txnTagNameOrId.id}`
                                   : `Cannot find the given txn tag with name = ${(txnTagNameOrId as {name: string}).name}`
        );

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

export class TxnTagService
{
    public static async createTxnTag(ownerId: UUID, name: string)
    {
        const tagWithSameName = await TxnTagService.tryGetTxnTagByName(ownerId, name);
        if (tagWithSameName.found) return new TxnTagExistsError(name, ownerId);
        const owner = await UserRepository.getInstance().findOne({ where: { id: ownerId } });
        if (owner === null) return new UserNotFoundError(ownerId);
        const newTag = TxnTagRepository.getInstance().create();
        newTag.name = name;
        newTag.owner = owner;
        return await TxnTagRepository.getInstance().save(newTag);
    }

    public static async getTxnTagById(ownerId: UUID, id: UUID)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) return new UserNotFoundError(ownerId);

        const result = await TxnTagRepository.getInstance()
        .createQueryBuilder(`tag`)
        .where(`tag.${keyNameOfTxnTag('id')} = :id AND tag.${keyNameOfTxnTag('ownerId')} = :ownerId`, { id: id, ownerId: ownerId })
        .getOne();

        if (!result || !id) return new TxnTagNotFoundError({id: id}, ownerId);

        return {
            id: result.id,
            name: result.name,
            ownerId: result.ownerId
        };
    }

    public static async getUserTxnTags
    (
        ownerId: UUID,
        config:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            name?: string,
            id?: UUID,
        }
    )
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) return new UserNotFoundError(ownerId);

        let query = TxnTagRepository.getInstance()
        .createQueryBuilder(`tag`)
        .where(`tag.${keyNameOfTxnTag('ownerId')} = :ownerId`, {ownerId: ownerId });

        if (config.name !== undefined) query = query.andWhere(`tag.${keyNameOfTxnTag('name')} LIKE :name`, { title: `%${config.name}%` })

        query = paginateQuery(query, config);
        const queryResult = await query.getManyAndCount();

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0].map(q => (
            {
                id: q.id,
                name: q.name,
                ownerId: q.ownerId
            })),
        };
    }

    public static async tryGetTxnTagByName(ownerId: UUID, name: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: ownerId }});
        if (!user) throw new UserNotFoundError(ownerId);

        const result = await TxnTagRepository.getInstance()
        .createQueryBuilder(`type`)
        .where(`type.${keyNameOfTxnTag('name')} = :name AND type.${keyNameOfTxnTag('ownerId')} = :ownerId`, { name: name, ownerId: ownerId })
        .getOne();

        if (result) return { found: true as const, obj: result }
        else return { found: false as const, obj: null }
    }
}