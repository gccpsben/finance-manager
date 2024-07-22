import express from 'express';

const router = express.Router();

router.get("/api/v1/dev/ping", async (req:express.Request, res:express.Response) => 
{
    res.json({success: true});
});

export default router;