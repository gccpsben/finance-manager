import express = require('express');
import { Express, Request, Response } from "express";
import { AccessTokenClassModel } from '../finance/accessToken';
import { ContainerClass } from '../finance/container';
import { TotalValueRecordModel } from '../finance/totalValueRecord';
import { TransactionModel } from '../finance/transaction';
import { CurrencyModel } from '../finance/currency';

const router = express.Router();

router.get(`/api/v1/finance/graphs`, async (req: Request, res:Response) => 
{
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    res.status(200).json(await ContainerClass.getExpensesAndIncomes());
});

router.get(`/api/v1/finance/netWorth`, async (req:any,res:any) => 
{
    try 
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        res.json(await ContainerClass.getNetWorthHistory(8640000));   
    }
    catch(error) { res.status(400); res.json( { errors: error.errors } ); }
});

router.get(`/api/v1/finance/summary`, async (req:any, res:any) => 
{ 
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    let allTxns = (await TransactionModel.find());
    let allCurrencies = await CurrencyModel.find();
    let oneWeekAgoDate = new Date();  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7);
    let oneMonthAgoDate = new Date(); oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);

    // Calculate all the changeInValue of transactions.
    // An extra properties will be added to the hydrated txns: changeInValue
    let hydratedTxns:any = [];
    for (let index in allTxns)
    {
        hydratedTxns.push(
        {
            ...(allTxns[index].toJSON()),
            "changeInValue": await (allTxns[index].getChangeInValue(allCurrencies))
        });
    }

    // a list of txns with changeInValue > 0
    // type is lost since an extra property "changeInValue" is added.
    let allIncomeTxns:any = hydratedTxns.filter(tx => tx.changeInValue > 0); 
    let allExpenseTxns:any = hydratedTxns.filter(tx => tx.changeInValue < 0);        

    // The income/expense of last 30d will be sorted from oldest to newest.
    let incomeTxns30d:any = allIncomeTxns.filter(tx => tx.date > oneMonthAgoDate).sort((b,a) => b.date - a.date); 
    let expenseTxns30d:any = allExpenseTxns.filter(tx => tx.date > oneMonthAgoDate).sort((b,a) => b.date - a.date); 
    let incomeTxns7d:any = allIncomeTxns.filter(tx => tx.date > oneWeekAgoDate).sort((b,a) => b.date - a.date); 
    let expenseTxns7d:any = allExpenseTxns.filter(tx => tx.date > oneWeekAgoDate).sort((b,a) => b.date - a.date); 

    let output = 
    {
        "totalIncomes30d": incomeTxns30d.reduce((acc:any, val:any) => acc + val.changeInValue, 0),
        "totalExpenses30d": expenseTxns30d.reduce((acc:any, val:any) => acc - val.changeInValue, 0),
        "totalIncomes7d": incomeTxns7d.reduce((acc:any, val:any) => acc + val.changeInValue, 0),
        "totalExpenses7d": expenseTxns7d.reduce((acc:any, val:any) => acc - val.changeInValue, 0),
        "totalIncomes": allIncomeTxns.reduce((acc:any, val:any) => acc + val.changeInValue, 0),
        "totalExpenses": allExpenseTxns.reduce((acc:any, val:any) => acc - val.changeInValue, 0),
        "incomes30d": incomeTxns30d,
        "expenses30d": expenseTxns30d,
        "allPendingTransactions": hydratedTxns.filter(x => x.isTypePending && x.resolution == undefined),
        "totalTransactionsCount": await TransactionModel.count()
    };
    output['totalValue'] = output.totalIncomes - output.totalExpenses;
    
    res.json(output);
});

export default router;