import { Repository } from "typeorm";
import { Currency } from "../entities/currency.entity.js";
import { Database } from "../db.js";
import { RepositoryCache } from "../dataCache.js";
import { type SQLitePrimitiveOnly } from "../../index.d.js";
import { CurrencyService } from "../services/currency.service.js";

export class CurrencyListCache extends RepositoryCache
{
    private _currenciesList: SQLitePrimitiveOnly<Currency>[] | undefined = undefined;
    public constructor(ownerId: string) { super(ownerId); }

    public getCurrenciesList(): SQLitePrimitiveOnly<Currency>[] | undefined { return this._currenciesList; }
    public setCurrenciesList(list: SQLitePrimitiveOnly<Currency>[]) 
    { 
        if (list.find(x => x.ownerId !== this._ownerId))
            throw new Error(`DataCache owner mismatch: Data inserted into DataCache must only belong to one user.`);
        this._currenciesList = list;
    }
    public async ensureCurrenciesList() 
    {  
        if (this._currenciesList !== undefined) return;
        this.setCurrenciesList(await CurrencyService.getUserAllCurrencies(this._ownerId)); 
    }
}

class CurrencyRepositoryExtension
{
    public async isCurrencyByIdExists(this: Repository<Currency>, currencyId: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne(
        {
            where: { id: currencyId, owner: { id: userId } },
            relations: { owner: true } 
        });
        return !!currency;
    }

    public async isCurrencyByNameExists(this: Repository<Currency>, name: string, userId: string): Promise<boolean>
    {
        const currency = await this.findOne(
        {
            where: { name: name, owner: { id: userId } },
            relations: { owner: true } 
        });
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