import * as express from "express";
import { TransactionModel, TransactionTypeModel } from "../finance/transaction";
import { AccessTokenClassModel } from "../finance/accessToken";
import { log, logBlue } from "../extendedLog";
import { ContainerModel } from "../finance/container";
import { genUUID } from "../uuid";
import { CurrencyModel } from "../finance/currency";

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
        let onlyUnresolved = query.onlyunresolved == "true";

        // Postprocess query
        let rangeFullyDefined = startingIndex !== undefined && endingIndex !== undefined;
        
        // Validate query args
        if (rangeFullyDefined && startingIndex > endingIndex)
            throw new Error(`Starting index must not be smaller than ending index.`);

        // Process queries
        let currencies = await CurrencyModel.find();
        let queryChain = TransactionModel.find();

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

        // Filter by name (if any)
        if (searchText !== undefined) queryChain = queryChain.find( {"$text": {"$search": searchText.toString()}} );
        queryChain = queryChain.sort({"date":-1});

        // Execute query
        let originalTxns = await queryChain as any;

        // Filter based on resolution, and calculate changeInValue in the process
        await (async function() 
        {
            let tempArray = [] as any;
            for (let index = 0; index < originalTxns.length; index++) 
            {
                let tx = originalTxns[index];

                if (onlyUnresolved && !tx.isTypePending) continue;
                if (onlyUnresolved && (tx.isTypePending && tx.isResolved)) continue;

                tempArray.push(
                {
                    ...tx.toJSON(),
                    "changeInValue": await tx.getChangeInValue(currencies)
                });
            }
            originalTxns = tempArray;
        })();

        let originalLength = originalTxns.length;

        // Calculate total value change, (since the changeInValue is already calculated)
        let totalValueChange = originalTxns.reduce((acc, item) => { return acc + item.changeInValue }, 0);
        
        // Pagination should not be done in the DB side, since we lose the original count of items in array.
        // Do this in the last
        let pagedTxns = rangeFullyDefined ? originalTxns.slice(startingIndex, endingIndex) : originalTxns;

        res.json(
        {
            totalItems: originalLength,
            startingIndex: Math.min(startingIndex, originalLength),
            endingIndex: Math.min(endingIndex, originalLength),
            rangeItems: pagedTxns,
            totalValueChange: totalValueChange
        }); 
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