import { Repository } from "typeorm";
import { Currency } from "../entities/currency.entity.js";
import { Database } from "../db.js";

class CurrencyRepositoryExtension
{
    public async customFind(this: Repository<Currency>) 
    {
        const result = await this.createQueryBuilder()
        .getMany();
        return result;
    }
}

export class CurrencyRepository
{
    private static extendedRepo: Repository<Currency> & CurrencyRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!CurrencyRepository.extendedRepo) 
            CurrencyRepository.extendedRepo = Database.AppDataSource.getRepository(Currency).extend(new CurrencyRepositoryExtension())      
        return CurrencyRepository.extendedRepo;
    }
}