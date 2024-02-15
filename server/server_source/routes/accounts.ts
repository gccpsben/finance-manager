import express = require("express");
import { AccountClass, AccountClassModel } from "../finance/account";

const router = express.Router();

router.post("/api/v1/finance/accounts/register", async (req,res) => 
{
    try
    {
        let newlyCreatedAccount = await AccountClassModel.register(req.body.username, req.body.password);
        res.json(
        {
            username: newlyCreatedAccount.username,
            id: newlyCreatedAccount["_id"]
        });
    }
    catch(ex) { res.status(400).json( { "error": ex }); }
});
router.post(`/api/v1/finance/login`, async (req:any, res:any) => 
{
    try
    {
        let body = req.body;
        let username = body.username;
        let password = body.password;
        let accessToken = await AccountClass.login(username, password, req.get("User-Agent"));
        let jwtToken = `Bearer ${await accessToken.generateJWTBearer()}`;
        res.json({"token": jwtToken});
    }
    catch(ex)
    {
        let statusCode = ex == "Username or password don't match" ? 401 : 400;
        res.status(statusCode).json( {"error": ex.message} );
    }
});

export default router;