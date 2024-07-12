import express = require("express");
import { Express, Request, Response } from "express";
import { AccessTokenClassModel } from "../finance/accessToken";
import { CurrencyClass, CurrencyModel, CurrencyRateClass, CurrencyRateModel } from "../finance/currency";
import { genUUID } from "../uuid";
import { log } from "../extendedLog";

const router = express.Router();

function onError(req: Request, res:Response, error: Error)
{
    log(error); 
    res.status(400).send({message: error?.message}); 
}

router.get(`/api/v1/finance/currencies`, async (req:any, res:any) => 
{
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }
    res.json(await CurrencyModel.getLatestRateHydratedCurrencies()); 
});

router.post(`/api/v1/finance/currencies/add`, async (req:any, res:any) => 
{
    try
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        let newID = genUUID();
        let currency = new CurrencyModel(
        {
            ...req.body,
            "pubID": newID
        });

        res.json(await currency.save()); 
    }
    catch(error) { log(error); res.status(400).send({message: error}); }
});

router.post(`/api/v1/finance/currencies/rates`, async (req: Request, res: Response) => 
{
    try
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }
        let rawDataJSON = req.body.data;
        if (!rawDataJSON) throw new Error(`The given body should contain "data"`);
        if (!(rawDataJSON instanceof Array)) throw new Error(`The given JSON is not an array.`);
        await CurrencyRateClass.importJSONRaw(JSON.stringify(rawDataJSON));
        res.status(200).json({});
    }
    catch(error) { onError(req,res, error); }
});

router.get(`/api/v1/finance/currencies/rates/public`, async (req: Request, res:Response) => 
{
    try
    {
        // This is a public API, no need to check for auth
        let currencySymbol = req.query["symbol"];
        let currency = await CurrencyModel.findOne({symbol: currencySymbol});
        if (!currency) throw new Error(`Cannot find currency with symbol "${currencySymbol}"`);
        let latestRate = await currency.getLatestRate();
        res.status(200).json({ "latestRate": latestRate, "name": currency.name, "symbol": currency.symbol, "fallbackRate": currency.fallbackRate });
    }
    catch(error) { onError(req, res, error); }
});

export default router;