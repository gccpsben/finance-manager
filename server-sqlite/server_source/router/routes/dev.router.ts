import express from 'express';
import { Database } from '../../db/db.ts';

const router = express.Router();

router.get("/api/v1/dev/ping", async (req:express.Request, res:express.Response) =>
{
    console.log(
        await Database.getTransactionRepository()?.getTransactionsJSONQuery(
            "d63effa6-c161-4d81-ae47-acb559476bf6",
            "1",
            null,
            null,
            null,
            null,
            null,
            null
        )
    );
    res.json({success: true});
});

export default router;