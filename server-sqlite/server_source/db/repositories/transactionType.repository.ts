import { Repository } from "typeorm";
import { TransactionType } from "../entities/transactionType.entity.js";
import { Database } from "../db.js";
import { panic } from "../../std_errors/monadError.js";

class TransactionTypeRepositoryExtension
{
    isTransactionTypeByIdExists = async function(this: Repository<TransactionType>, TransactionTypeId: string, userId: string): Promise<boolean>
    {
        const TransactionType = await this.findOne({where: { id: TransactionTypeId, owner: { id: userId } }});
        return !!TransactionType;
    }
}

export class TransactionTypeRepository
{
    private static extendedRepo: (Repository<TransactionType> & TransactionTypeRepositoryExtension) | undefined = undefined;

    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        if (!TransactionTypeRepository.extendedRepo)
            TransactionTypeRepository.extendedRepo = Database.AppDataSource.getRepository(TransactionType)
                                                                           .extend(new TransactionTypeRepositoryExtension());
        return TransactionTypeRepository.extendedRepo;
    }
}