import express from 'express';
import * as core from "express-serve-static-core";
import { ExtendedLog } from './extendedLog.js';
import getMainRouter from './router/mainRouter.js';
import morgan from 'morgan';
import { PassThrough } from 'stream';
import { ValidationError } from 'class-validator';
import { randomUUID } from 'crypto';
import createHttpError from 'http-errors';
import { QueryFailedError } from 'typeorm';
import { UserNameTakenError } from './db/services/user.service.js';

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
            // @ts-ignore
            const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
            const msg = 
            [
                ip,
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
        const returnErrorToRes = (res:express.Response, code: number, returns: { msg: string, name: string, details: Object | undefined, errorRef: string | undefined }) => 
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
                    name: "ValidationError",
                    errorRef: undefined
                });
            }
            if (err instanceof createHttpError.HttpError && err.status !== 500)
            {
                return returnErrorToRes(res, err.statusCode, 
                {
                    details: undefined,
                    msg: err.message,
                    name: err.name,
                    errorRef: undefined
                });
            }           
            if (err instanceof QueryFailedError)
            {
                const msgUUID = randomUUID();
                const consoleMsg = `Error while querying database (ErrorRefNo: ${msgUUID})`;
                const logFileMsg = `Error while querying database (ErrorRefNo: ${msgUUID}).`
                + `\n${JSON.stringify(err, null, 4)}`
                + `\nAbove error stack trace: ${err.stack}`;
                ExtendedLog.logRed(consoleMsg, false, true);
                ExtendedLog.logRed(logFileMsg, true, false);    

                return returnErrorToRes(res, 500, 
                {
                    details: undefined,
                    msg: "Error while querying database",
                    name: err.name,
                    errorRef: msgUUID
                });
            }
            if (err instanceof UserNameTakenError)
            {
                return returnErrorToRes(res, 400, 
                {
                    details: undefined,
                    msg: err.message,
                    name: err.name,
                    errorRef: undefined
                });
            }
            
            const msgUUID = randomUUID();
            const consoleMsg = `Uncaught error from handler middleware (ErrorRefNo: ${msgUUID})`;
            const logFileMsg = `Uncaught error from handler middleware (ErrorRefNo: ${msgUUID}).`
            + `\n${JSON.stringify(err, null, 4)}`
            + `\nAbove error stack trace: ${err.stack}`;
            ExtendedLog.logRed(consoleMsg, false, true);
            ExtendedLog.logRed(logFileMsg, true, false);

            return returnErrorToRes(res, 500, 
            {
                details: undefined,
                msg: err.message,
                name: err.name,
                errorRef: msgUUID
            });
        };
    }

    public static startServer(port:number, config: Partial<StartServerConfig> = {})
    {
        const shouldAttachMorgan = config?.attachMorgan ?? true;

        return new Promise<void>(resolve => 
        {
            Server.expressApp = express();
            Server.expressApp.use(express.json());
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