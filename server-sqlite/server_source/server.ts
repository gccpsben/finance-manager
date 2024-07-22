import { Request, Response } from 'express';
import express from 'express';
import * as core from "express-serve-static-core";
import { ExtendedLog } from './extendedLog.js';

export class Server
{
    private static expressApp: core.Express;
    private static _expressServer: Server;
    public static get expressServer() { return Server._expressServer; }
    private static set expressServer(value: Server) { Server._expressServer = value; }

    public static startServer()
    {
        return new Promise<void>(resolve => 
        {
            Server.expressApp = express();
            Server.expressServer = Server.expressApp.listen(3010, () => 
            {
                ExtendedLog.logGreen(`Server running at port ${3010}`);
                resolve();
            }); 
        });
    }
}