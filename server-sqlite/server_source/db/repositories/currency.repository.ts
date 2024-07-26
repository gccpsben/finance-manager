import { Repository } from "typeorm";
import { Currency } from "../entities/currency.entity.js";
import { Database } from "../db.js";

class CurrencyRepositoryExtension
{
    public async isCurrencyByIdExists(this: Repository<Currency>, currencyId: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne({where: { id: currencyId, owner: { id: userId } }});
        return !!currency;
    }

    public async isCurrencyByNameExists(this: Repository<Currency>, name: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne({where: { currencyName: name, owner: { id: userId } }});
        return !!currency;
    }

    public async isCurrencyByTickerExists(this: Repository<Currency>, ticker: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne({where: { ticker: ticker, owner: { id: userId } }});
        return !!currency;
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