import { Repository } from "typeorm";
import { Transaction } from "../entities/transaction.entity.js";
import { Database } from "../db.js";
import { panic } from "../../std_errors/monadError.js";

class TransactionRepositoryExtension
{
    isTransactionByIdExists = async function (this: Repository<Transaction>, TransactionId: string, userId: string): Promise<boolean>
    {
        const Transaction = await this.findOne({where: { id: TransactionId, owner: { id: userId } }});
        return !!Transaction;
    }
}

export class TransactionRepository
{
    private static extendedRepo: (Repository<Transaction> & TransactionRepositoryExtension) | undefined = undefined;

    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        if (!TransactionRepository.extendedRepo)
            TransactionRepository.extendedRepo = Database.AppDataSource.getRepository(Transaction).extend(new TransactionRepositoryExtension());

        return TransactionRepository.extendedRepo;
    }
}