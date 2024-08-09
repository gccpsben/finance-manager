import { SQLitePrimitiveOnly } from "../index.d.js";
import { Currency } from "./entities/currency.entity.js";
import { CurrencyRateDatum } from "./entities/currencyRateDatum.entity.js";
import { User } from "./entities/user.entity.js";
import { CurrencyService } from "./services/currency.service.js";

export class MutableDataCache
{
    private _owner: SQLitePrimitiveOnly<User> | string;
    private _currenciesRateDatumsList: { [currId: string]: SQLitePrimitiveOnly<CurrencyRateDatum>[] } = {};
    private _currenciesList: SQLitePrimitiveOnly<Currency>[] | undefined = undefined;

    public constructor(owner: SQLitePrimitiveOnly<User> | string)
    {
        this._owner = owner;
    }

    private _getOwnerId()
    {
        if (typeof this._owner === 'string') return this._owner;
        else return this._owner.id;
    }

    public getCurrenciesRateDatumsList(currId: string) { return this._currenciesRateDatumsList[currId]; }
    public setCurrenciesRateDatumsList(currId: string, list: SQLitePrimitiveOnly<CurrencyRateDatum>[]) 
    { 
        if (list.find(x => x.ownerId !== this._getOwnerId()))
            throw new Error(`DataCache owner mismatch: Data inserted into DataCache must only belong to one user.`);
        this._currenciesRateDatumsList[currId] = list;
    }

    public getCurrenciesList(): SQLitePrimitiveOnly<Currency>[] | undefined { return this._currenciesList; }
    public async ensureCurrenciesList() 
    {  
        if (this._currenciesList !== undefined) return;
        this.setCurrenciesList(await CurrencyService.getUserAllCurrencies(this._getOwnerId())); 
    }
    public setCurrenciesList(list: SQLitePrimitiveOnly<Currency>[]) 
    { 
        if (list.find(x => x.ownerId !== this._getOwnerId()))
            throw new Error(`DataCache owner mismatch: Data inserted into DataCache must only belong to one user.`);
        this._currenciesList = list;
    }
}

export class ReadonlyDataCache
{
    private _mutableDataCache: MutableDataCache;

    public constructor(mutableDataCache: MutableDataCache)
    {
        this._mutableDataCache = mutableDataCache;
    }

    public getCurrenciesRateDatumsList(currId: string) 
    { 
        return this._mutableDataCache.getCurrenciesRateDatumsList(currId); 
    }

    public getCurrenciesList() 
    { 
        return this._mutableDataCache.getCurrenciesList(); 
    }
}