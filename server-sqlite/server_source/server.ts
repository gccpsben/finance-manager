import { Request, Response } from 'express';
import express from 'express';
import * as core from "express-serve-static-core";
import { ExtendedLog } from './extendedLog.js';
import getMainRouter from './router/mainRouter.js';
import morgan from 'morgan';
import { PassThrough, Stream } from 'stream';

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

    public static startServer(config: Partial<StartServerConfig> = {})
    {
        const shouldAttachMorgan = config?.attachMorgan ?? true;

        return new Promise<void>(resolve => 
        {
            Server.expressApp = express();
            if (shouldAttachMorgan) Server.expressApp.use(Server.getMorganLoggerMiddleware());
            Server.expressApp.use("/", getMainRouter());

            Server.expressServer = Server.expressApp.listen(3010, () => 
            {
                ExtendedLog.logGreen(`Server running at port ${3010}`);
                resolve();
            }); 
        });
    }
}