import express from 'express';
import * as core from "express-serve-static-core";
import { ExtendedLog } from './extendedLog.js';
import getMainRouter from './router/mainRouter.js';
import morgan from 'morgan';
import { PassThrough } from 'stream';
import { ValidationError } from 'class-validator';

export type StartServerConfig =
{
    attachMorgan: boolean;
}

export class Server
{
    private static expressApp: core.Express;
    private static _expressServer: Server;
    public static get expressServer() { return Server._expressServer; }
    private static set expressServer(value: Server) { Server._expressServer = value; }

    private static getMorganLoggerMiddleware()
    {
        // Create an empty stream for morgan, we will handle the logging ourself
        const xs = new PassThrough({objectMode: true});

        return morgan((tokens, req, res) => 
        {
            const msg = 
            [
                tokens.method(req, res),
                tokens.url(req, res),
                tokens.status(req, res),
                tokens.res(req, res, 'content-length'), '-',
                tokens['response-time'](req, res), 'ms'
            ].join(' ');
            ExtendedLog.logGray(msg, true, true);
            return '';
        }, { skip: () => false, stream: xs })
    }

    public static getErrorHandlerMiddleware()
    {
        const returnErrorToRes = (res:express.Response, code: number, returns: { msg: string, name: string, details: Object | undefined }) => 
        {
            return res.status(code).json(returns);
        }; 

        return (err: Error, req: express.Request, res: express.Response, next: Function) => 
        {
            if (err instanceof ValidationError)
            {
                return returnErrorToRes(res, 400, 
                {
                    details: err,
                    msg: "Request failed with validation error(s)",
                    name: "ValidationError"
                });
            }
            return returnErrorToRes(res, 500, 
            {
                details: undefined,
                msg: err.message,
                name: err.name
            });
        };
    }

    public static startServer(port:number, config: Partial<StartServerConfig> = {})
    {
        const shouldAttachMorgan = config?.attachMorgan ?? true;

        return new Promise<void>(resolve => 
        {
            Server.expressApp = express();
            if (shouldAttachMorgan) Server.expressApp.use(Server.getMorganLoggerMiddleware());
            Server.expressApp.use("/", getMainRouter());
            Server.expressApp.use(Server.getErrorHandlerMiddleware());
            Server.expressServer = Server.expressApp.listen(port, () => 
            {
                ExtendedLog.logGreen(`Server running at port ${port}`);
                resolve();
            }); 
        });
    }
}