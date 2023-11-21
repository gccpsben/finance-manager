import express = require("express");
import { getLog } from "../extendedLog";
import { systemLaunchTime } from "../server";

const router = express.Router();

router.get("/api/", (req:any, res:any) => { res.json({message:"welcome to the entry API"}); });
router.get("/api/", (req:any, res:any) => { res.json({message:"welcome to the entry API"}); });
router.get("/api/systemLaunchTime", (req:any, res:any) => { res.json({launchTime:systemLaunchTime}); });
router.get("/api/pastLog", (req:any, res:any) => 
{ 
    if (req.query.lines) { res.json(getLog(Number.parseInt(req.query.lines))); }
    else { res.json(getLog()); }
});

export default router;