
import { getModelForClass, modelOptions, mongoose, prop } from "@typegoose/typegoose";
import { AmountClass } from "./amount";
import { DataCache } from "./dataCache";
import { CurrencyClass } from "./currency";

@modelOptions ( {schemaOptions: { collection: "containers" } } )
export class ContainerClass
{
    @prop( { type:String, required: true } )
    pubID: string;

    @prop( { type:String, required: true} )
    name: string;

    @prop( { type:String, required: true, default: [] } )
    ownersID: mongoose.Types.Array<string>;

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
        } = { pubID: this.pubID, balance:{}, balanceActual:{}, value:0, valueActual: 0 };
        // var output = {pubID: this.pubID, balance:{}, value:0};

        cache.allTransactions!.forEach(tx => 
        {
            // Add balance if defined.
            if (tx.to != undefined && tx.to != null)
            {
                // Check if the transaction relates to the current container:
                if (tx.to.containerID == this.pubID.toString())
                {
                    let cID = tx.to.amount.currencyID;
                    let respectiveCurrency:CurrencyClass|undefined = cache!.allCurrencies!.find(x => x.pubID.toString() == cID);

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
                        output.value += respectiveCurrency.rate * tx.to!.amount.value;
                        if (tx.isResolved || !tx.isTypePending) output.valueActual += respectiveCurrency.rate * tx.to!.amount.value;
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
                    let respectiveCurrency:CurrencyClass|undefined = cache!.allCurrencies!.find(x => x.pubID.toString() == cID);

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
                        output.value -= respectiveCurrency.rate * tx.from!.amount.value;
                        if (tx.isResolved || !tx.isTypePending) output.valueActual -= respectiveCurrency.rate * tx.from!.amount.value;
                    }
                }
            }
        });

        return output;
    }

    // cached results can be provided to speed up the function.
    public static async getAllContainersTotalBalance(cache?: DataCache|undefined)
    {
        // find all containers, currencies and transactions
        if (cache == undefined) cache = new DataCache();
        await DataCache.ensure(cache);

        var output:any = [];
        for (var i = 0; i < cache.allContainers!.length; i++)
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
        await DataCache.ensure(cache);
        
        let allTransactions = [...cache.allTransactions]; allTransactions.forEach(x => { x.date = new Date(x.date); });
        var topExpenses = 0;
        var latestDate = new Date(0);
        var oldestDate = new Date();

        // var keyingFunction = (x:Date) => x.toLocaleDateString(); // Advance per day
        // var advanceFunction = (x:Date) => new Date(x.setDate(x.getDate() + 1)); // Advance per day

        var keyingFunction = (x:Date) => `${x.getMonth()}-${x.getFullYear()}`; // Advance per month
        var advanceFunction = (x:Date) => new Date(x.setMonth(x.getMonth() + 1)); // Advance per month
        let getValue = (currencyID: string, amount: number) => cache.allCurrencies.find(x => x.pubID == currencyID)?.rate * amount ?? 0;

        var expensesMap: {[key: string]: number} = {};
        var allExpenses = allTransactions.filter(x => x.from && !x.to);
        allExpenses.forEach(item => 
        { 
            let value = getValue(item.from!.amount.currencyID, item.from!.amount.value as number);
            var key = keyingFunction(item.date);

            if (item.date.getTime() >= latestDate.getTime()) latestDate = item.date;
            if (item.date.getTime() <= oldestDate.getTime()) oldestDate = item.date;
            if (value > topExpenses) topExpenses = value;

            expensesMap[key] = expensesMap[key] ? expensesMap[key] + value : value;
        });

        var incomesMap: {[key: string]: number} = {};
        var allIncomes = allTransactions.filter(x => !x.from && x.to);
        allIncomes.forEach(item => 
        { 
            let value = getValue(item.to!.amount.currencyID, item.to!.amount.value as number);
            var key = keyingFunction(item.date);

            if (item.date.getTime() >= latestDate.getTime()) latestDate = item.date;
            if (item.date.getTime() <= oldestDate.getTime()) oldestDate = item.date;

            incomesMap[key] = incomesMap[key] ? incomesMap[key] + value : value;
        });

        //               date,         income, expenses
        var totalMap: { [key: string]:[number, number] } = {};
        var loop = oldestDate;
        while(loop <= latestDate)
        {   
            // var newDate = new Date(loop.setDate(loop.getDate() + 1)); // Advance per day
            var newDate = advanceFunction(loop); // Advance per month

            var dateString = keyingFunction(newDate);
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
}

export const ContainerModel = getModelForClass(ContainerClass);