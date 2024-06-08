import express = require("express");
import { TransactionTypeModel } from "../finance/transaction";
import { AccessTokenClassModel } from "../finance/accessToken";
import { genUUID } from "../uuid";
import { log } from "../extendedLog";

const router = express.Router();

router.get(`/api/v1/finance/transactionTypes`, async (req:any, res:any) => 
{
    // Check for permission and login
    if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

    res.json((await TransactionTypeModel.find()).map(type => 
    {
        delete type['__v'];
        return type;
    })); 
});
router.post(`/api/v1/finance/types/add`, async (req:any, res:any) => 
{
    try
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        let newID = genUUID();
        let type = new TransactionTypeModel(
        {
            pubID: newID,
            ...req.body,
            isEarning: true,
            isExpense: true
        });

        res.json(await type.save()); 
    }
    catch(error) { res.status(400).send({message: error}); }
});

export default router;