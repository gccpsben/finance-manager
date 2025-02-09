import express from 'express';
import { ExtendedLogger } from '../debug/extendedLog.ts';
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
import { Database } from "../db/db.ts";
import { setGlobalEntityValidationLogger } from '../db/dbEntityBase.ts';
import { GlobalCurrencyCache } from '../db/caches/currencyListCache.cache.ts';
import { GlobalCurrencyRateDatumsCache } from '../db/caches/currencyRateDatumsCache.cache.ts';
import { GlobalCurrencyToBaseRateCache } from '../db/caches/currencyToBaseRate.cache.ts';
import { GlobalAccessTokenCache } from '../db/caches/accessTokens.cache.ts';

export type StartServerConfig =
{
    attachMorgan: boolean;
}

export function getDefaultMorganLoggerMiddleware(
    toFile = true,
    toConsole = true,
    onLogCallback: (msg: string, toFile: boolean, toConsole: boolean) => void
)
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

        if (toFile || toConsole) onLogCallback(msg, toFile, toConsole);
        return '';
    }, { skip: () => false, stream: xs })
}

export function getDefaultErrorHandlerMiddleware(onLog: (msg: string, toFile: boolean, toConsole: boolean) => void)
{
    const returnErrorToRes = (res:express.Response, code: number, returns: { msg: string, name: string, details: object | undefined, errorRef: string | undefined }) =>
    {
        return res.status(code).json(returns);
    };

    return (err: Error, _req: express.Request, res: express.Response, _next: CallableFunction) =>
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
            onLog(consoleMsg, false, true);
            onLog(logFileMsg, true, false);

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
        onLog(consoleMsg, false, true);
        onLog(logFileMsg, true, false);

        return returnErrorToRes(res, 500,
        {
            details: undefined,
            msg: err.message,
            name: err.name,
            errorRef: msgUUID
        });
    };
}

export class Server
{
    private logger: ExtendedLogger;
    private expressApp: express.Express;
    private expressServer: HTTPSServer | HTTPServer;
    public CRONRunner: CronRunner | null;

    private constructor(
        app: express.Express,
        server: HTTPSServer | HTTPServer,
        CRONRunner: CronRunner | null,
        logger: ExtendedLogger
    )
    {
        this.logger = logger;
        this.CRONRunner = CRONRunner;
        this.expressApp = app;
        this.expressServer = server;
    }

    public static async startServer(
        port:number,
        config: Partial<StartServerConfig> = {},
        logger: ExtendedLogger
    ): Promise<Server | null>
    {
        setGlobalEntityValidationLogger(logger);

        // Load certs if needed
        let sslKeyFile = undefined as undefined | Buffer;
        let sslPemFile = undefined as undefined | Buffer;
        {
            if (EnvManager.isSSLDefined())
            {
                try
                {
                    sslKeyFile = readFileSync(EnvManager.sslKeyFullPath!);
                    sslPemFile = readFileSync(EnvManager.sslPemFullPath!);
                }
                catch(e)
                {
                    logger.logRed(`Error loading SSL key or pem: ${e}`);
                    return null;
                }
            }
        }

        const cronRunner = new CronRunner(logger);
        const expressApp = express();
        const expressServer = EnvManager.isSSLDefined() ?
                                createHttpsServer({ key: sslKeyFile, cert: sslPemFile }, expressApp) :
                                createHttpServer(expressApp);

        const shouldAttachMorgan = config?.attachMorgan ?? true;

        // Start CRON services
        {
            await cronRunner.initAll();
            await cronRunner.startAll();
        }

        await new Promise<void>(resolve =>
        {
            expressApp.use(helmet());
            expressApp.use(express.json({type: 'application/json'}));
            expressApp.use(express.raw({ limit: "50mb" })); // allow for larger file chunk upload
            expressApp.use(compression());

            if (shouldAttachMorgan)
                expressApp.use(getDefaultMorganLoggerMiddleware
                (
                    EnvManager.restfulLogMode === RESTfulLogType.TO_BOTH || EnvManager.restfulLogMode === RESTfulLogType.TO_FILE_ONLY,
                    EnvManager.restfulLogMode === RESTfulLogType.TO_BOTH || EnvManager.restfulLogMode === RESTfulLogType.TO_CONSOLE_ONLY,
                    (msg, toFile, toConsole) => logger.logGray(msg, toFile, toConsole)
                ));

            expressApp.use("/", getMainRouter(logger));
            expressApp.use(getDefaultErrorHandlerMiddleware(
                (msg, toFile, toConsole) => logger.logRed(msg, toFile, toConsole)
            ));

            expressServer.listen(port, () =>
            {
                logger.logGreen(`${EnvManager.isSSLDefined() ? 'HTTPS' : 'HTTP'} server running at port ${port}`);
                resolve();
            });
        });

        return new Server(
            expressApp,
            expressServer,
            cronRunner,
            logger
        );
    }

    public shutdownServer()
    {
        this.clearCache();
        this.CRONRunner?.stopAll();
        this.CRONRunner?.destroyAll();
        Database.getFileReceiver()?.close();
        this.expressServer.closeAllConnections();
        this.expressServer.close();
        this.logger.shutdown();
    }

    public clearCache()
    {
        GlobalCurrencyCache.reset();
        GlobalCurrencyRateDatumsCache.reset();
        GlobalCurrencyToBaseRateCache.reset();
        GlobalAccessTokenCache.reset();
    }

    public getServerPort()
    {
        const addr = this.expressServer.address();
        if (addr === null) return null;
        if (typeof addr === 'string') return null;
        return addr.port;
    }
}