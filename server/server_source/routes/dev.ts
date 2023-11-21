import express = require('express');
import { TotalValueRecordClass } from '../finance/totalValueRecord';
import { CurrencyModel, CurrencyRateModel } from '../finance/currency';
import { TransactionClass, TransactionModel } from '../finance/transaction';
import { ContainerClass, ContainerModel, balanceSnapshot } from '../finance/container';
import { AmountClass } from '../finance/amount';

const router = express.Router();



router.get("/api/v1/dev/update2", async (req:express.Request, res:express.Response) => 
{
    // res.json(Container);
});

router.get("/api/v1/dev/update", async (req:express.Request, res:express.Response) => 
{
    res.json(await ContainerClass.getExpensesAndIncomes());
});

export default router;