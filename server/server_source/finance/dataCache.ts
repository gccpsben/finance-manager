import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
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
    }
}