import express = require("express");
import { AccessTokenClassModel } from "../finance/accessToken";
import { ContainerClass, ContainerModel } from "../finance/container";
import { genUUID } from "../uuid";
import { log } from "../extendedLog";

const router = express.Router();

router.get(`/api/v1/finance/containers`, async (req:any ,res:any) => 
{ 
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    res.json(await ContainerClass.getAllContainersTotalBalance()); 
});

router.post(`/api/v1/finance/containers/add`, async (req:any,res:any) =>
{
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    try 
    { 
        let newTxnID = genUUID();
        res.json(await new ContainerModel({...req.body, "pubID": newTxnID}).save()); 
    }
    catch(error) { res.status(400); res.json( { errors: error } ); }
});

router.post(`/api/v1/finance/containers/remove`, async (req:any,res:any) =>
{
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    let idToRemove = req.body.id;
    try {  res.json(await ContainerModel.findById({"pubID":idToRemove}).deleteOne()); }
    catch(error) { res.status(400); res.json( { errors: error.errors } ); }
});

export default router;