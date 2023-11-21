import express = require("express");
import { Express, Request, Response } from "express";
import { AccessTokenClassModel } from "../finance/accessToken";
import { CurrencyModel, CurrencyRateClass } from "../finance/currency";
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
    
    // Hydrate the currencies documents with the latest rates
    let originals = (await CurrencyModel.find().select(['symbol', 'name', 'pubID', 'fallbackRate']));
    let hydrated: (Partial<CurrencyRateClass> & { rate: number })[] = [];
    
    for (let currency of originals)
    {
        hydrated.push({
            rate: await currency.getLatestRate(),
            ...currency.toJSON()
        });
    }

    res.json(hydrated); 
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

export default router;