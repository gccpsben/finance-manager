import * as express from "express";
import { TransactionModel, TransactionTypeModel } from "../finance/transaction";
import { AccessTokenClassModel } from "../finance/accessToken";
import { log, logBlue } from "../extendedLog";
import { ContainerModel } from "../finance/container";
import { genUUID } from "../uuid";
import { CurrencyModel } from "../finance/currency";
import { Unpacked } from "mongoose";

const router = express.Router();

router.get("/api/v1/finance/transactions", async (req, res) => 
{
    try
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) return res.status(401).json({});

        // Deconstrcut query
        let query = req.query;
        let startingIndex = query.start ? parseInt(query?.start.toString()) : undefined;
        let endingIndex = query.end ? parseInt(query?.end.toString()) : undefined;
        let searchText = query.text ? query?.text.toString() : undefined;
        let txnID = query.pubid ? query?.pubid.toString() : undefined;
        let onlyUnresolved = query?.onlyunresolved == "true";

        // Postprocess query
        let rangeFullyDefined = startingIndex !== undefined && endingIndex !== undefined;
        
        // Validate query args
        if (rangeFullyDefined && startingIndex > endingIndex)
            throw new Error(`Starting index must not be smaller than ending index.`);

        // Process queries
        let currencies = await CurrencyModel.find();
        (async () => 
        {
            // (If txnID is given, skip everything and return the txn only)
            if (txnID)
            {
                let txnObject = await TransactionModel.findOne({pubID: txnID});
                if (txnObject == undefined) res.status(404).json({});
                else
                {
                    res.json(
                    {
                        ...txnObject.toJSON(),
                        changeInValue: await txnObject.getChangeInValue(currencies)
                    });
                }
                return;
            }

            let queryChain = TransactionModel.find();

            // Exclude resolved transaction (if onlyUnresolved is set to true)
            if (onlyUnresolved)
                queryChain = queryChain.find( { "isTypePending": true, "isResolved": false } );

            // Filter by name (if any)
            if (searchText !== undefined) 
                queryChain = queryChain.find( {"$text": {"$search": searchText.toString()}} );

            // Sort by most recent
            queryChain = queryChain.sort({"date":-1});

            // This is the length of the results of the query WITHOUT pagination
            let originalLength = await queryChain.clone().count();

            // This is the list of txns that are within the [startingIndex, endingIndex], obtained via executing query
            let pagedTxns = await (async () => 
            {
                if (rangeFullyDefined) 
                {
                    queryChain = queryChain.skip(startingIndex).limit(endingIndex - startingIndex);
                    return await queryChain;
                }
                else return await queryChain;
            })();

            // A list of txns that are within the requested range, with extra key "changeInValue"
            let hydratedPagedTxns: (Unpacked<typeof pagedTxns> & { changeInValue: number })[] = [];
            for (let txn of pagedTxns)
            {
                hydratedPagedTxns.push(
                {
                    ...txn,
                    changeInValue: await txn.getChangeInValue(currencies)
                } as Unpacked<typeof hydratedPagedTxns>);
            }

            res.json(
            {
                totalItems: originalLength,
                startingIndex: Math.min(startingIndex, originalLength),
                endingIndex: Math.min(endingIndex, originalLength),
                rangeItems: pagedTxns,
            }); 
        })();
    }
    catch(error) { log(error); res.status(400).send({message: error}); }
});

router.post("/api/v1/finance/transactions", async (req, res) =>
{
    try 
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        let newTxnID = genUUID();
        let txn = new TransactionModel(
        {
            ...req.body, 
            "pubID": newTxnID,
            "isFromBot": false
        }); 

        let fromContainerID = req.body?.from?.containerID ?? undefined;
        let toContainerID = req.body?.to?.containerID ?? undefined;
        let typeID = req.body?.typeID ?? undefined;
        let fromContainerPass = req.body?.from ? await ContainerModel.isExist(fromContainerID) : true;
        let toContainerPass = req.body?.to ? await ContainerModel.isExist(toContainerID) : true;
        let typeExists = req.body?.typeID && await TransactionTypeModel.isExist(typeID);

        // if (req.body.date != undefined) txn.date = new Date(req.body.date);

        // Check if containers exist
        if (!fromContainerPass || !toContainerPass) throw new Error(`Container pubID=${fromContainerID || toContainerID} doesn't exist.`);

        // Check if type exists
        if (!typeExists)  throw new Error(`Transaction Type pubID=${typeExists} doesn't exist.`);

        res.json(await txn.save()); 
    }
    catch(error) { res.status(400).send({message: error}); }
});

router.delete(`/api/v1/finance/transactions`, async (req,res) =>
{
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    let idToRemove = req.body.id;
    try { res.json(await TransactionModel.findById({"pubID":idToRemove}).deleteOne()); }
    catch(error) { res.status(400); res.json( { errors: error.errors } ); }
});

router.post(`/api/v1/finance/transactions/resolve`, async (req, res) => 
{ 
    try
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        let allTxs = (await TransactionModel.find());
        let allUnresolvedTxns = allTxs.filter(x => !x.isResolved);
        let idToResolve = req.body.resolveID as string;
        let targetToResolve = allUnresolvedTxns.filter(x => x.pubID == idToResolve)[0];
        if (targetToResolve == undefined) throw new Error(`The given pubID is not found, or is already resolved.`);
        targetToResolve.resolution = { date: new Date() };
        await targetToResolve.save();
        res.json(targetToResolve);
    }
    catch(error) { log(error); res.status(400).send({message: error}); }
});

export default router;