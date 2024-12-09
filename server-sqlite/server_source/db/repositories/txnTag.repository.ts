import { Repository } from "typeorm";
import { TxnTag } from "../entities/txnTag.entity.js";
import { Database } from "../db.js";
import { panic } from "../../std_errors/monadError.js";

class TransactionTypeRepositoryExtension
{
    isTransactionTypeByIdExists = async function(this: Repository<TxnTag>, TransactionTypeId: string, userId: string): Promise<boolean>
    {
        const txnTag = await this.findOne({where: { id: TransactionTypeId, owner: { id: userId } }});
        return !!txnTag;
    }
}

export class TransactionTypeRepository
{
    private static extendedRepo: (Repository<TxnTag> & TransactionTypeRepositoryExtension) | undefined = undefined;

    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        if (!TransactionTypeRepository.extendedRepo)
            TransactionTypeRepository.extendedRepo = Database.AppDataSource.getRepository(TxnTag)
                                                                           .extend(new TransactionTypeRepositoryExtension());
        return TransactionTypeRepository.extendedRepo;
    }
}