import { SQLitePrimitiveOnly } from "../../index.d.js";
import { RepositoryCache } from "../dataCache.js";
import { Currency } from "../entities/currency.entity.js";
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
