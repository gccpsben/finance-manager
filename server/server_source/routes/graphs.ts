import express = require('express');
import { Request, Response } from "express";
import { AccessTokenClassModel } from '../finance/accessToken';
import { ContainerClass } from '../finance/container';
import { TransactionClass } from '../finance/transaction';
import { CurrencyModel, CurrencyRateModel } from '../finance/currency';
import { LinearInterpolator } from '../LinearInterpolator';
import { DataCache, TransactionClassWithoutTitle } from '../finance/dataCache';

const router = express.Router();

router.get(`/api/v1/finance/graphs`, async (req: Request, res:Response) => 
{
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    res.status(200).json(await ContainerClass.getExpensesAndIncomes());
});

router.get(`/api/v1/finance/balanceHistory`, async (req: Request, res: Response) =>
{
    try 
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        // Transform the data into another structure to save space
        type outputType = 
        {
            timestamps: string[],
            balance: { [currencyID:string]: number[] },
            balanceActual: { [currencyID:string]: number[] }
        };

        let toUnqiueArray = <T>(x:T[]) => Array.from(new Set(x));
        let keys = <T>(x:T) => Object.keys(x);
        let values = <T>(x:T) => Object.values(x);
        let getLastItem = <T>(x:T[]) => x[x.length - 1];
        let history = await ContainerClass.getTotalBalanceHistory();
        let lastSnapshot = history[getLastItem(keys(history))];
        let allCurrenciesID = lastSnapshot ? toUnqiueArray([...keys(lastSnapshot.balance), ...keys(lastSnapshot.balanceActual)]) : [];
        let transformed: outputType = 
        {
            "timestamps": Object.keys(history),
            "balance": Object.fromEntries(allCurrenciesID.map(id => [id, Object.values(history).map(snapshot => snapshot.balance[id] ?? 0)])),
            "balanceActual": Object.fromEntries(allCurrenciesID.map(id => [id, Object.values(history).map(snapshot => snapshot.balanceActual[id] ?? 0)]))
        };

        let currencies = (await CurrencyModel.find());
        let allRates = await CurrencyRateModel.find();
        let currenciesInterpolators: {[key: string]: LinearInterpolator} = {};
        for (let currency of currencies)
        {
            let rates = allRates
            .filter(x => x.currencyPubID == currency.pubID)
            .map(x => { return {"key": x.date.getTime(), "value": x.rate} });
            currenciesInterpolators[currency.pubID] = LinearInterpolator.fromEntries(rates);
        }

        // Check if the arrays length are the same
        let getCurrency = (pubID:string) => allCurrencies.find(c => c.pubID == pubID);
        let allCurrencies = await CurrencyModel.find();
        let timestampsInt = transformed.timestamps.map(x => parseInt(x));
        let rates: { [pubID:string]:{[timestamp:string]:number} } = Object.fromEntries(allCurrenciesID.map(pubID => 
        {
            let interpolator = currenciesInterpolators[pubID];
            return [pubID, Object.fromEntries(timestampsInt.map(time => 
            {
                let rate = interpolator.getValueNew(time);
                if (rate === undefined) rate = getCurrency(pubID).fallbackRate ?? 0;
                return [time.toString(), rate];
            }))]
        }));

        let timestampLength = transformed.timestamps.length;
        let balanceLengths = toUnqiueArray(Object.values(transformed.balance).map(pts => pts.length));
        let balanceActualLengths = toUnqiueArray(Object.values(transformed.balanceActual).map(pts => pts.length));
        if (balanceActualLengths.length > 1 || balanceLengths.length > 1 || timestampLength != balanceActualLengths[0] || balanceActualLengths[0] != balanceLengths[0])
            throw new Error("Lengths do not match.");

        // Transform amount in native currency to value at that time
        (function(subClasses:Array<'balance'|'balanceActual'>)
        {
            for (let subClass of subClasses)
            {
                Object.keys(transformed[subClass]).forEach(pubID => 
                {
                    transformed[subClass][pubID] = transformed[subClass][pubID].map((val, index) => 
                    {
                        return val * rates[pubID][transformed.timestamps[index]];
                    });
                });
            }
        })(['balance','balanceActual']);

        res.json(transformed);
    }
    catch(error) { res.status(400); res.json( { errors: error.errors } ); }
});

router.get(`/api/v1/finance/netWorth`, async (req:any,res:any) => 
{
    try 
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        res.json(await ContainerClass.getNetWorthHistory(undefined, 8640000));   
    }
    catch(error) { res.status(400); res.json( { errors: error.errors } ); }
});

router.get(`/api/v1/finance/summary`, async (req:any, res:any) => 
{ 
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }
    res.json(await getSummary());
});

export async function getSummary(cache?: DataCache|undefined)
{
    if (cache == undefined) cache = new DataCache();
    
    let allTxns: (TransactionClassWithoutTitle | TransactionClass)[] = [];

    // We dont care about the title, if cache contains `allTransactions`, use that to proces. Otherwise, try fetching `allTransactionsWithTitle` instead
    // to save bandwidth
    if (!cache.allTransactionWithoutTitle && !cache.allTransactions)
    {
        cache = await DataCache.ensureTransactionsWithoutTitle(cache);
        allTxns = cache.allTransactionWithoutTitle;
    }
    else allTxns = cache.allTransactionWithoutTitle || cache.allTransactions;

    cache = await DataCache.ensureContainers(cache);
    cache = await DataCache.ensureCurrencies(cache);
   
    let allCurrencies = cache.allCurrencies;
    let oneWeekAgoDate = new Date();  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7);
    let oneMonthAgoDate = new Date(); oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);

    // Calculate all the changeInValue of transactions.
    // An extra properties will be added to the hydrated txns: changeInValue
    type hydratedTxn = (TransactionClass & {changeInValue: number});
    let hydratedTxns: hydratedTxn[] = [];
    for (let index in allTxns)
    {
        hydratedTxns.push(
        {
            ...allTxns[index]["_doc"],
            "changeInValue": await (allTxns[index].getChangeInValue(allCurrencies))
        });
    }

    // a list of txns with changeInValue > 0
    let allIncomeTxns:Array<hydratedTxn> = hydratedTxns.filter(tx => tx.changeInValue > 0); 
    let allExpenseTxns:Array<hydratedTxn> = hydratedTxns.filter(tx => tx.changeInValue < 0);       

    // The income/expense of last 30d will be sorted from oldest to newest.
    let incomeTxns30d:Array<hydratedTxn> = allIncomeTxns.filter(tx => tx.date > oneMonthAgoDate).sort((b,a) => b.date.getTime() - a.date.getTime()); 
    let expenseTxns30d:Array<hydratedTxn> = allExpenseTxns.filter(tx => tx.date > oneMonthAgoDate).sort((b,a) => b.date.getTime() - a.date.getTime()); 
    let incomeTxns7d:Array<hydratedTxn> = allIncomeTxns.filter(tx => tx.date > oneWeekAgoDate).sort((b,a) => b.date.getTime() - a.date.getTime()); 
    let expenseTxns7d:Array<hydratedTxn> = allExpenseTxns.filter(tx => tx.date > oneWeekAgoDate).sort((b,a) => b.date.getTime() - a.date.getTime()); 

    let output = 
    {
        "totalIncomes30d": incomeTxns30d.reduce((acc, val) => acc + val.changeInValue, 0),
        "totalExpenses30d": expenseTxns30d.reduce((acc, val) => acc - val.changeInValue, 0),
        "totalIncomes7d": incomeTxns7d.reduce((acc, val) => acc + val.changeInValue, 0),
        "totalExpenses7d": expenseTxns7d.reduce((acc, val) => acc - val.changeInValue, 0),
        "totalIncomes": allIncomeTxns.reduce((acc, val) => acc + val.changeInValue, 0),
        "totalExpenses": allExpenseTxns.reduce((acc, val) => acc - val.changeInValue, 0),
        "incomes30d": incomeTxns30d,
        "expenses30d": expenseTxns30d,
        "allPendingTransactions": hydratedTxns.filter(x => x.isTypePending && x.resolution == undefined),
        "totalTransactionsCount": hydratedTxns.length
    };
    output['totalValue'] = output.totalIncomes - output.totalExpenses;
    return output;
}

export default router;