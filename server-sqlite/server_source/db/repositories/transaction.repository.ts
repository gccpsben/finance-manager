import { Repository } from "typeorm";
import { Transaction } from "../entities/transaction.entity.js";
import { Database } from "../db.js";

class TransactionRepositoryExtension
{
    public async isTransactionByIdExists(this: Repository<Transaction>, TransactionId: string, userId: string): Promise<boolean>
    {
        const Transaction = await this.findOne({where: { id: TransactionId, owner: { id: userId } }});
        return !!Transaction;
    }
}

export class TransactionRepository
{
    private static extendedRepo: Repository<Transaction> & TransactionRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!TransactionRepository.extendedRepo) 
            TransactionRepository.extendedRepo = Database.AppDataSource.getRepository(Transaction).extend(new TransactionRepositoryExtension())      
        return TransactionRepository.extendedRepo;
    }
}