// This file contains some APIs which combined different other API's endpoint into a single endpoint to speed up lookup time
// since the DataCache object can be reused.

import express = require('express');
import { Request, Response } from "express";
import { AccessTokenClassModel } from '../finance/accessToken';
import { ContainerClass } from '../finance/container';
import { TransactionClass } from '../finance/transaction';
import { CurrencyClass, CurrencyModel, CurrencyRateModel } from '../finance/currency';
import { LinearInterpolator } from '../LinearInterpolator';
import { DataCache, TransactionClassWithoutTitle } from '../finance/dataCache';
import { getSummary } from './graphs';

const router = express.Router();

router.get(`/api/v1/finance/batch/dashboard`, async (req:any, res:any) => 
{ 
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }
    
    let cache = new DataCache();
    cache = await DataCache.ensure(cache);

    res.json({
        summary: await getSummary(cache),
        netWorth: await ContainerClass.getNetWorthHistory(cache),
        containersHydrated: await ContainerClass.getAllContainersTotalBalance(cache),
        currenciesHydrated: await CurrencyClass.getLatestRateHydratedCurrencies(cache)
    });
});

export default router;