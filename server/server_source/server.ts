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
import minify = require('express-minify');
import { checkDatabaseIntegrity } from './database';

export let isDevelopment = true;
export let isUnitTest = false;
export let expressApp = undefined;
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
        expressApp.use(helmet({contentSecurityPolicy: false}));
        server = isSSLDefined ? require('https').createServer({ key:sslKey, cert:sslCert }, expressApp) : require('http').createServer(expressApp);
        port = parseInt(process.env.PORT) || 55561;

        // Initialize endpoints
        if (process.env.DIST_FOLDER == undefined) logYellow("Warning: DIST_FOLDER isn't defined in the env file.");
        expressApp.use(Express.json({limit: '50mb'}));
        expressApp.use(minify());
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

export function startLogger()
{
    let logFormat = `:date[iso] :remote-addr :method :url :status - :response-time ms`;
    let logStream = { stream: fs.createWriteStream('./log.log', { flags: 'a' }) };
    expressApp.use(morgan(logFormat, logStream));
    expressApp.use(morgan(logFormat));
}