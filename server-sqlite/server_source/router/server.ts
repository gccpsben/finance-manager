import express from 'express';
import { ExtendedLog } from '../debug/extendedLog.ts';
import { getMainRouter } from './mainRouter.ts';
import morgan from 'morgan';
import { PassThrough } from 'node:stream';
import { ValidationError } from 'class-validator';
import { randomUUID } from 'node:crypto';
import createHttpError from 'http-errors';
import { QueryFailedError } from 'typeorm';
import { UserNameTakenError } from '../db/services/user.service.ts';
import { EnvManager, RESTfulLogType } from '../env.ts';
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer, Server as HTTPServer } from 'node:http';
import { createServer as createHttpsServer, Server as HTTPSServer } from 'node:https';
import helmet from "helmet";
import compression from 'compression';
import { Buffer } from "node:buffer";
import { CronRunner } from "../crons/cronService.ts";

export type StartServerConfig =
{
    attachMorgan: boolean;
}

export class Server
{
    private static expressApp: express.Express;
    private static _expressServer: HTTPSServer | HTTPServer;
    public static CRONRunner: CronRunner | null;
    public static get expressServer() { return Server._expressServer; }
    private static set expressServer(value: HTTPSServer | HTTPServer) { Server._expressServer = value; }

    private static getMorganLoggerMiddleware(toFile = true, toConsole = true)
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

            if (toFile || toConsole) ExtendedLog.logGray(msg, toFile, toConsole);
            return '';
        }, { skip: () => false, stream: xs })
    }

    public static getErrorHandlerMiddleware()
    {
        const returnErrorToRes = (res:express.Response, code: number, returns: { msg: string, name: string, details: Object | undefined, errorRef: string | undefined }) =>
        {
            return res.status(code).json(returns);
        };

        return (err: Error, _req: express.Request, res: express.Response, _next: Function) =>
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

    public static async startServer(port:number, config: Partial<StartServerConfig> = {})
    {
        const shouldAttachMorgan = config?.attachMorgan ?? true;
        let sslKeyFile = undefined as undefined | Buffer;
        let sslPemFile = undefined as undefined | Buffer;

        if (EnvManager.isSSLDefined())
        {
            try
            {
                sslKeyFile = readFileSync(EnvManager.sslKeyFullPath!);
                sslPemFile = readFileSync(EnvManager.sslPemFullPath!);
            }
            catch(e)
            {
                ExtendedLog.logRed(`Error loading SSL key or pem: ${e}`);
                return;
            }
        }

        // Start CRON services
        {
            const cronRunner = new CronRunner();
            await cronRunner.initAll();
            await cronRunner.startAll();
        }

        return new Promise<void>(resolve =>
        {
            Server.expressApp = express();
            Server.expressApp.use(helmet());
            Server.expressApp.use(express.json({type: 'application/json'}));
            Server.expressApp.use(express.raw({ limit: "50mb" })); // allow for larger file chunk upload
            Server.expressApp.use(compression());

            if (shouldAttachMorgan)
                Server.expressApp.use(Server.getMorganLoggerMiddleware
                (
                    EnvManager.restfulLogMode === RESTfulLogType.TO_BOTH || EnvManager.restfulLogMode === RESTfulLogType.TO_FILE_ONLY,
                    EnvManager.restfulLogMode === RESTfulLogType.TO_BOTH || EnvManager.restfulLogMode === RESTfulLogType.TO_CONSOLE_ONLY
                ));

            Server.expressApp.use("/", getMainRouter());
            Server.expressApp.use(Server.getErrorHandlerMiddleware());

            Server.expressServer = EnvManager.isSSLDefined() ?
                createHttpsServer({ key: sslKeyFile, cert: sslPemFile }, Server.expressApp) :
                createHttpServer(Server.expressApp);

            Server.expressServer.listen(port, () =>
            {
                ExtendedLog.logGreen(`${EnvManager.isSSLDefined() ? 'HTTPS' : 'HTTP'} server running at port ${port}`);
                resolve();
            });
        });
    }

    public static shutdownServer()
    {
        this.expressServer.closeAllConnections();
        this.expressServer.close();
        this.CRONRunner?.stopAll();
    }
}