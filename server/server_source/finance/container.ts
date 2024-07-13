
import { getModelForClass, modelOptions, mongoose, prop } from "@typegoose/typegoose";
import { AmountClass } from "./amount";
import { DataCache, TransactionClassWithoutTitle } from "./dataCache";
import { CurrencyClass, CurrencyModel, CurrencyRateModel } from "./currency";
import { TransactionClass, TransactionModel } from "./transaction";
import { LinearInterpolator } from "../LinearInterpolator";

export type balanceSnapshot = 
{
    balance: {[key:string]: number},
    balanceActual: {[key:string]: number}, // this amount is without any pending transactions
};


@modelOptions ( {schemaOptions: { collection: "containers" }, existingMongoose: mongoose  } )
export class ContainerClass
{
    @prop( { type:String, required: true } )
    pubID: string;

    @prop( { type:String, required: true} )
    name: string;    

    @prop( { type:String, required: true, default: [] } )
    ownersID: mongoose.Types.Array<string>;

    public async getBalancesHistory(cache?: DataCache|undefined)
    {
        if (this["_id"] == undefined) throw new Error(`This container doesn't exist in the database. Save it before calling this function.`)
        cache = await DataCache.ensureTransactions(cache);

        let balanceState : balanceSnapshot = { balance: {}, balanceActual:{} };
        let output: { [ timestamp :number]: balanceSnapshot } = {};
        
        for (let tx of cache.allTransactions.sort((a: TransactionClass,b : TransactionClass) => 
        {
            return a.date.getTime() - b.date.getTime();
        }))
        {
            // Add balance if defined.
            if (tx.to != undefined && tx.to != null)
            {
                // Check if the transaction relates to the current container:
                if (tx.to.containerID == this.pubID.toString())
                {
                    let cID = tx.to.amount.currencyID;

                    if (cID in balanceState.balance) balanceState.balance[cID] += tx.to.amount.value;
                    else balanceState.balance[cID] = tx.to.amount.value;

                    if (tx.isResolved || !tx.isTypePending)
                    {
                        if (cID in balanceState.balanceActual) balanceState.balanceActual[cID] += tx.to.amount.value;
                        else balanceState.balanceActual[cID] = tx.to.amount.value;
                    }
                }
            }

            // Subtract balance if defined.
            if (tx.from != undefined && tx.from != null)
            {
                // Check if the transaction relates to the current container:
                if (tx.from.containerID == this.pubID.toString())
                {
                    let cID = tx.from.amount.currencyID;

                    if (cID in balanceState.balance) balanceState.balance[cID] -= tx.from.amount.value;
                    else balanceState.balance[cID] = tx.from.amount.value * -1;

                    if (tx.isResolved || !tx.isTypePending)
                    {
                        if (cID in balanceState.balanceActual) balanceState.balanceActual[cID] -= tx.from.amount.value;
                        else balanceState.balanceActual[cID] = tx.from.amount.value * -1;
                    }
                }
            }

            output[tx.date.getTime()] = structuredClone(balanceState);
        };

        return output;
    }

    // cached results can be provided to speed up the function.
    public async getTotalBalance(cache?:DataCache|undefined)
    {
        if (this["_id"] == undefined) throw new Error(`This container doesn't exist in the database. Save it before calling this function.`)
        cache = await DataCache.ensure(cache);

        // Expected output
        // { value:2.1, balance: { "63b5fe6c13e0eeed4d8d1fad": 2.1, ... }, _id: '63b5fbad98550215af18cd31' }
        let output: 
        {
            pubID: string,
            balance: {[key:string]: number},
            balanceActual: {[key:string]: number}, // this amount is without any pending transactions
            value: number,
            valueActual: number
        } = { pubID: this.pubID, balance:{}, balanceActual:{}, value: 0, valueActual: 0 };

        for (let tx of cache.allTransactions)
        {
            // Add balance if defined.
            if (tx.to != undefined && tx.to != null)
            {
                // Check if the transaction relates to the current container:
                if (tx.to.containerID == this.pubID.toString())
                {
                    let cID = tx.to.amount.currencyID;
                    let respectiveCurrency:CurrencyClass|undefined = cache!.allCurrencies!.find(x => x.pubID.toString() == cID);
                    let rate = await respectiveCurrency.getLatestRate();

                    if (cID in output.balance) output.balance[cID] += tx.to.amount.value;
                    else output.balance[cID] = tx.to.amount.value;

                    if (tx.isResolved || !tx.isTypePending)
                    {
                        if (cID in output.balanceActual) output.balanceActual[cID] += tx.to.amount.value;
                        else output.balanceActual[cID] = tx.to.amount.value;
                    }

                    // Calculate value change
                    if (respectiveCurrency != undefined) 
                    { 
                        output.value += rate * tx.to!.amount.value;
                        if (tx.isResolved || !tx.isTypePending) output.valueActual += rate * tx.to!.amount.value;
                    }
                }
            }

            // Subtract balance if defined.
            if (tx.from != undefined && tx.from != null)
            {
                // Check if the transaction relates to the current container:
                if (tx.from.containerID === this.pubID.toString())
                {
                    let cID = tx.from.amount.currencyID;
                    let respectiveCurrency:CurrencyClass|undefined = cache!.allCurrencies!.find(x => x.pubID.toString() == cID);
                    let rate = await respectiveCurrency.getLatestRate();

                    if (cID in output.balance) output.balance[cID] -= tx.from.amount.value;
                    else output.balance[cID] = tx.from.amount.value * -1;

                    if (tx.isResolved || !tx.isTypePending)
                    {
                        if (cID in output.balanceActual) output.balanceActual[cID] -= tx.from.amount.value;
                        else output.balanceActual[cID] = tx.from.amount.value * -1;
                    }

                    // Calculate value change
                    if (respectiveCurrency != undefined) 
                    {
                        output.value -= rate * tx.from!.amount.value;
                        if (tx.isResolved || !tx.isTypePending) output.valueActual -= rate * tx.from!.amount.value;
                    }
                }
            }
        };

        return output;
    }

    public static async getNetWorthHistory(cache?: DataCache | undefined, intervalMs:number = 86400000)
    {
        if (cache == undefined) cache = new DataCache();
        
        cache = await DataCache.ensureCurrencies();
        let currencies = cache.allCurrencies;

        /** Use mapping instead of array.find for performance. (around 50ms faster for 8k output items in output.netWorthHistory) */
        const currenciesPubIDMapping: { [pubID: string]: CurrencyClass } = (() => 
        {
            let mapping = {};
            for (let i = 0; i < currencies.length; i++)
                mapping[currencies[i].pubID] = currencies[i];
            return mapping;
        })();
        
        const allRates = await CurrencyRateModel.find();
        let currenciesInterpolators: {[key: string]: LinearInterpolator} = {};
        for (let currency of currencies)
        {
            let rates = allRates
            .filter(x => x.currencyPubID == currency.pubID)
            .map(x => { return {"key": x.date.getTime(), "value": x.rate} });
            currenciesInterpolators[currency.pubID] = LinearInterpolator.fromEntries(rates);
        }

        /** use for loop instead of reduce for slight performance increase */
        const sum = (numbers:number[]) => 
        { 
            let sum = 0;
            for (let num of numbers) sum += num;
            return sum
        };

        const getBalanceWorth = (bal: balanceSnapshot, timestamp: number) => 
        {
            let getCurrencyRate = (pubID:string) => { return currenciesInterpolators[pubID].getValueNew(timestamp) ?? currenciesPubIDMapping[pubID].fallbackRate ?? 0; };
            return {
                "balance": sum(Object.entries(bal.balance).map(entry => entry[1] * getCurrencyRate(entry[0]))),
                "balanceActual": sum(Object.entries(bal.balanceActual).map(entry => entry[1] * getCurrencyRate(entry[0])))
            };
        };
    
        
        let balHistory = await ContainerModel.getTotalBalanceHistory(cache, intervalMs);
        let worthHistory: {[timestamp:string]:number} = {};
        let worthActualHistory: {[timestamp:string]:number} = {};
        for (let timestampStr in balHistory)
        {
            let timestamp = parseInt(timestampStr);
            let worths = getBalanceWorth(balHistory[timestampStr], timestamp);
    
            worthHistory[timestampStr] = worths.balance;
            worthActualHistory[timestampStr] = worths.balanceActual;
        }
        return {
            "netWorthHistory": worthHistory,
            "netWorthActualHistory": worthActualHistory,
        };
    }

    /**
     * Get the balance history of all containers combined.
     */
    // 500-600 ms
    public static async getTotalBalanceHistory(cache?: DataCache | undefined, intervalMs: number = 86400000)
    {
        if (cache == undefined) cache = new DataCache();

        let allTxn: (TransactionClassWithoutTitle | TransactionClass)[] = [];
        if (!cache.allTransactionWithoutTitle && !cache.allTransactions)
        {
            cache = await DataCache.ensureTransactionsWithoutTitle(cache);
            allTxn = cache.allTransactionWithoutTitle;
        }
        else allTxn = cache.allTransactionWithoutTitle || cache.allTransactions;
    
        allTxn.sort((a:TransactionClass,b:TransactionClass) => a.date.getTime() - b.date.getTime()); // 3-4ms
        
        let oldestDate = Math.min(...allTxn.map(txn => txn.date.getTime()));
        
        let currentDate = oldestDate;
        let now = Date.now();
        let currentBalance: {[key: string]: number} = {};
        let currentBalanceActual: {[key: string]: number} = {};
        let output: {[key:string]: balanceSnapshot} = {};
        while (currentDate < now)
        {
            let txnToRemove: string[] = [];
            for (let i = 0; i < allTxn.length; i++)
            {
                let txn = allTxn[i];
                let date = txn.date.getTime();
                if (date > currentDate) break;               
                if (txn.from) 
                {
                    let balanceChanged = { [txn.from.amount.currencyID]: txn.from.amount.value };
                    currentBalance = AmountClass.substractObject(currentBalance, balanceChanged);
                    if (txn.isResolved || !txn.isTypePending) currentBalanceActual = AmountClass.substractObject(currentBalanceActual, balanceChanged);
                }
                if (txn.to) 
                {
                    let balanceChanged = { [txn.to.amount.currencyID]: txn.to.amount.value };
                    currentBalance = AmountClass.addObject(currentBalance, balanceChanged);
                    if (txn.isResolved || !txn.isTypePending) currentBalanceActual = AmountClass.addObject(currentBalanceActual, balanceChanged);
                }

                txnToRemove.push(txn.pubID);
            }

            allTxn = allTxn.filter(x => !txnToRemove.includes(x.pubID));

            output[currentDate] = 
            {
                "balance": currentBalance,
                "balanceActual": currentBalanceActual
            };

            currentDate += intervalMs;
        }
        return output;
    }

    /**
     * cached results can be provided to speed up the function.
     * @param cache 
     * @returns 
     */
    public static async getAllContainersTotalBalance(cache?: DataCache|undefined)
    {
        // find all containers, currencies and transactions
        if (cache == undefined) cache = new DataCache();
        await DataCache.ensure(cache);

        let output:any = [];
        for (let i = 0; i < cache.allContainers!.length; i++)
        {
            output.push(
            {
                ...await cache.allContainers![i].getTotalBalance(cache),
                "name": cache.allContainers![i].name,
                "ownersID": cache.allContainers![i].ownersID
            });
        }
        return output;
    }

    public static async getExpensesAndIncomes(cache?: DataCache|undefined)
    {
        // find all containers, currencies and transactions
        if (cache == undefined) cache = new DataCache();
        await DataCache.ensureTransactions(cache);
        await DataCache.ensureCurrencies(cache);
        
        let allTransactions = [...cache.allTransactions]; allTransactions.forEach(x => { x.date = new Date(x.date); });
        let topExpenses = 0;
        let latestDate = new Date(0);
        let oldestDate = new Date();
        let allRates = await CurrencyRateModel.find();
        let currenciesInterpolators: {[key: string]: LinearInterpolator} = {};

        for (let currency of cache.allCurrencies)
        {
            let rates = allRates
            .filter(x => x.currencyPubID == currency.pubID)
            .map(x => { return {"key": x.date.getTime(), "value": x.rate} });
            currenciesInterpolators[currency.pubID] = LinearInterpolator.fromEntries(rates);
        }

        // let keyingFunction = (x:Date) => x.toLocaleDateString(); // Advance per day
        // let advanceFunction = (x:Date) => new Date(x.setDate(x.getDate() + 1)); // Advance per day

        let keyingFunction = (x:Date) => `${x.getMonth()}-${x.getFullYear()}`; // Advance per month
        let advanceFunction = (x:Date) => new Date(x.setMonth(x.getMonth() + 1)); // Advance per month
        let getValue = (currencyID: string, amount: number, timestamp: number) =>
        {
            let currency = cache.allCurrencies.find(x => x.pubID == currencyID);
            let rate = currenciesInterpolators[currencyID].getValueNew(timestamp);
            return (rate ?? currency.fallbackRate ?? 0) * amount;
        }

        let expensesMap: {[key: string]: number} = {};
        let allExpenses = allTransactions.filter(x => x.from && !x.to);
        allExpenses.forEach(async item => 
        { 
            let value = getValue(item.from!.amount.currencyID, item.from!.amount.value as number, item.date.getTime());
            let key = keyingFunction(item.date);

            if (item.date.getTime() >= latestDate.getTime()) latestDate = item.date;
            if (item.date.getTime() <= oldestDate.getTime()) oldestDate = item.date;
            if (value > topExpenses) topExpenses = value;

            expensesMap[key] = expensesMap[key] ? expensesMap[key] + value : value;
        });

        let incomesMap: {[key: string]: number} = {};
        let allIncomes = allTransactions.filter(x => !x.from && x.to);
        allIncomes.forEach(async item => 
        { 
            let value = getValue(item.to!.amount.currencyID, item.to!.amount.value as number, item.date.getTime());
            let key = keyingFunction(item.date);

            if (item.date.getTime() >= latestDate.getTime()) latestDate = item.date;
            if (item.date.getTime() <= oldestDate.getTime()) oldestDate = item.date;

            incomesMap[key] = incomesMap[key] ? incomesMap[key] + value : value;
        });

        //               date,         income, expenses
        let totalMap: { [key: string]:[number, number] } = {};
        let loop = oldestDate;
        while(loop <= latestDate)
        {   
            // let newDate = new Date(loop.setDate(loop.getDate() + 1)); // Advance per day
            let newDate = advanceFunction(loop); // Advance per month
            let dateString = keyingFunction(newDate);
            loop = newDate;
            totalMap[dateString] = [incomesMap[dateString] ?? 0, expensesMap[dateString] ?? 0];
        }
        
        const output = 
        {
            "expensesIncomesByDate": {
                labels: Object.keys(totalMap),
                incomes: Object.values(totalMap).map(x => x[0]),
                expenses: Object.values(totalMap).map(x => x[1] * -1)
            }
        };

        return output;
    }

    public static async isExist(containerID: string) : Promise<boolean> 
    { 
        return (await ContainerModel.find({pubID: containerID})).length > 0 
    };

    public getDelimiter() { return "/"; }
}

export const ContainerModel = getModelForClass(ContainerClass);