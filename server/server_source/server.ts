'use strict'

import path = require('path');
import * as dotenv from 'dotenv';
export let envFilePath = undefined as undefined | string;
import { logGreen, logRed, logBlue, getLog, logYellow, log } from "./extendedLog";
import * as Express from 'express';
import * as fs from 'fs';
import helmet from 'helmet';
import loadSSL, { isSSLDefined, sslCert, sslKey } from './ssl';
import getMainRouter from './router';
import morgan = require('morgan');
import compress = require('compression');
import { checkDatabaseIntegrity } from './database';

export let isDevelopment = true;
export let isUnitTest = false;
export let expressApp = undefined as undefined | Express.Express;
export let port = undefined as undefined | number;
export let server = undefined as any;

export let systemLaunchTime = new Date();
export let distFolderLocation = undefined as undefined | string;

export function loadEnv(filePath?:string)
{
    envFilePath = filePath || process.argv[2] || ".env";
    envFilePath = path.resolve(envFilePath);
    if (!fs.existsSync(envFilePath)) throw new Error(`Cannot find env file ${envFilePath}`);

    require('dotenv-expand').expand(dotenv.config({path: envFilePath})); // load env and expand using dotenv-expand
    log(`env file loaded from ${envFilePath}`);

    isDevelopment = process.env.NODE_ENV == "development" || process.env.NODE_ENV == "dev";
    isUnitTest = process.env.NODE_ENV == "test" || process.env.NODE_ENV == "tests";
    if (isUnitTest) isDevelopment = true;

    distFolderLocation = require('node:path').resolve(process.env.DIST_FOLDER ?? "./dist/")
}

export function attachMorganLogger(expressApp: Express.Express)
{
    expressApp.use(morgan((tokens, req, res) =>
    {
        const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '')
                   .toString()
                   .split(',')[0]
                   .trim();

        const status = tokens.status(req, res);

        const msg =
        [
            ip,
            tokens.method(req, res),
            tokens.url(req, res),
            status,
            tokens.res(req, res, 'content-length'), '-',
            tokens['response-time'](req, res), 'ms'
        ].join(' ');
        log(msg, true, false);
        return msg;
    }, { skip: () => false }));
}

export async function startServer()
{
    return new Promise<void>(async (resolve, reject) =>
    {
        logBlue(`Static folder set to ${distFolderLocation}`);
        (isDevelopment ? logRed : logGreen)(`Running with isDevelopment=${isDevelopment}`);
        if (isUnitTest) logRed(`Running with isUnitTest=${isUnitTest}`);
        loadSSL();

        // Finance Database Setup
        await require("./database").init(process.env.FINANCE_DB_FULL_URL);
        await checkDatabaseIntegrity();

        // Express server starts
        expressApp = Express();
        if (process.env.RESTFUL_VERBOSE == 'true') attachMorganLogger(expressApp);
        else logYellow(`Morgan logger is disabled since RESFUL_VERBOSE is not set to true.`);
        expressApp.use(helmet({contentSecurityPolicy: false}));
        expressApp.use(compress())
        server = isSSLDefined ? require('https').createServer({ key:sslKey, cert:sslCert }, expressApp) : require('http').createServer(expressApp);
        port = parseInt(process.env.PORT) || 55561;

        // Initialize endpoints
        if (process.env.DIST_FOLDER == undefined) logYellow("Warning: DIST_FOLDER isn't defined in the env file.");
        expressApp.use(Express.json({limit: '50mb'}));
        expressApp.use(require('express-useragent').express());
        expressApp.use("/", getMainRouter());

        // Initialize periodically-ran functions.
        require("./scheduler").initialize();

        server.listen(port, () =>
        {
            resolve();
            logGreen(`Started listening on ${port}`);
        });
    });
}