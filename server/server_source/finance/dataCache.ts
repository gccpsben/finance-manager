import { TransactionClass, TransactionModel, TransactionTypeClass, TransactionTypeModel } from "./transaction";
import { ContainerClass, ContainerModel } from "./container";
import { CurrencyClass, CurrencyModel } from "./currency";


export class DataCache
{
    public static allTransactionsGlobal?: Array<TransactionClass>;
    public static allCurrenciesGlobal?: Array<CurrencyClass>;
    public static allContainersGlobal?: Array<ContainerClass>;
    public static allTransactionTypesGlobal?: Array<TransactionTypeClass>;

    public allTransactions?: Array<TransactionClass>;
    public allCurrencies?: Array<CurrencyClass>;
    public allContainers?: Array<ContainerClass>;
    public allTransactionTypes?: Array<TransactionTypeClass>;

    // Ensure that all properties in this class are fetched from the database.
    public static async ensure(cache?: DataCache): Promise<DataCache>
    {
        if (cache == undefined) cache = new DataCache();
        if (cache.allContainers == undefined) 
        { 
            cache.allContainers = await ContainerModel.find(); // fetch all containers from db
            DataCache.allContainersGlobal = [...cache.allContainers];
        }
        if (cache.allCurrencies == undefined) 
        {
            cache.allCurrencies = await CurrencyModel.find(); // fetch all currencies from db
            DataCache.allCurrenciesGlobal = [...cache.allCurrencies];
        }
        if (cache.allTransactions == undefined) 
        {
            cache.allTransactions = await TransactionModel.find(); // fetch all transactions from db
            DataCache.allTransactionsGlobal = [...cache.allTransactions];
        }
        if (cache.allTransactionTypes == undefined) 
        {
            cache.allTransactionTypes = await TransactionTypeModel.find(); // fetch all types from db
            DataCache.allTransactionTypesGlobal = [...cache.allTransactionTypes];
        }
        return cache;
    }

    public static async ensureTransactions(cache?: DataCache)
    {
        if (cache == undefined) cache = new DataCache();
        if (cache.allTransactions == undefined) 
        {
            cache.allTransactions = await TransactionModel.find(); // fetch all transactions from db
            DataCache.allTransactionsGlobal = [...cache.allTransactions];
        }
        return cache;
    }

    public static async ensureCurrencies(cache?: DataCache)
    {
        if (cache == undefined) cache = new DataCache();
        if (cache.allCurrencies == undefined) 
        {
            cache.allCurrencies = await CurrencyModel.find(); // fetch all transactions from db
            DataCache.allCurrenciesGlobal = [...cache.allCurrencies];
        }
        return cache;
    }

    public static async ensureContainers(cache?: DataCache)
    {
        if (cache == undefined) cache = new DataCache();
        if (cache.allContainers == undefined) 
        {
            cache.allContainers = await ContainerModel.find(); // fetch all transactions from db
            DataCache.allContainersGlobal = [...cache.allContainers];
        }
        return cache;
    }
}

export type ExpiringValueCacheEntry<valueType> = 
{
    expireAfter: Date,
    value: valueType
};

export class ExpiringValueCache<valueType>
{
    public expirySpanMs:number = 0;
    public cache: {[key: string]: ExpiringValueCacheEntry<valueType>};

    public constructor(expirySpanMs: number) 
    { 
        this.cache = {};
        this.expirySpanMs = expirySpanMs; 
    }

    public async get(key:string, onUpdate: (key:string) => Promise<valueType> )
    {
        let isNoCache = !(key in this.cache);
        let isExpired = isNoCache ? false : new Date().getTime() >= this.cache[key].expireAfter.getTime();
        if (isExpired || isNoCache)
        {
            let newValue = await onUpdate(key);
            this.cache[key] = 
            {
                expireAfter: new Date(Date.now() + this.expirySpanMs),
                value: newValue
            };
        }
        return this.cache[key].value;
    }

    /**
     * Remove a key-value pair from the cache, and returns if any pair is successfully removed.
     * @param key 
     */
    public clearCache(key:string): boolean
    {
        if (!(key in this.cache)) return false;
        delete this.cache[key];
        return true;
    }
}