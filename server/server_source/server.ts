'use strict'

import * as dotenv from 'dotenv';
export let envFilePath = process.argv[2] || ".env";
require('dotenv-expand').expand(dotenv.config({path: envFilePath})); // load env and expand using dotenv-expand

import { logGreen, logRed, logBlue, getLog, logYellow, log } from "./extendedLog";
import * as Express from 'express';
import * as fs from 'fs';
import helmet from 'helmet';
import loadSSL, { isSSLDefined, sslCert, sslKey } from './ssl';
import getMainRouter from './router';
import morgan = require('morgan');
import minify = require('express-minify');
import { checkDatabaseIntegrity } from './database';

export let isDevelopment = process.env.NODE_ENV == "development" || process.env.NODE_ENV == "dev";
log(`env file loaded from ${envFilePath}`);

(isDevelopment ? logRed : logGreen)(`Running with isDevelopment=${isDevelopment}`);

loadSSL();

let app = Express();
app.use(helmet({contentSecurityPolicy: false}));

// Logger
(() => 
{
    let logFormat = `:date[iso] :remote-addr :method :url :status - :response-time ms`;
    let logStream = { stream: fs.createWriteStream('./log.log', { flags: 'a' }) };
    app.use(morgan(logFormat, logStream));
    app.use(morgan(logFormat));
})();

let server = isSSLDefined ? require('https').createServer({ key:sslKey, cert:sslCert }, app) : require('http').createServer(app);
let port = process.env.PORT || 55561;
export let systemLaunchTime = new Date();
export let distFolderLocation = require('node:path').resolve(process.env.DIST_FOLDER ?? "./dist/");
if (process.env.DIST_FOLDER == undefined) logYellow("Warning: DIST_FOLDER isn't defined in the env file.");

// initialization
(async function () 
{
    logBlue(`Static folder set to ${distFolderLocation}`);

    // Finance Database Setup
    await require("./database").init(process.env.FINANCE_DB_FULL_URL);
    await checkDatabaseIntegrity();

    // Initialize endpoints
    app.use(minify());
    app.use(Express.json({limit: '50mb'}));
    app.use(require('express-useragent').express());
    server.listen(port, () => { logGreen(`Started listening on ${port}`); });
    app.use("/", getMainRouter());

    // Initialize periodically-ran functions. 
    require("./scheduler").initialize();

    // // Catching signals and logging them
    // (function()
    // {
    //     ['SIG', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT','SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'].forEach(sig =>
    //     {
    //         process.on(sig, () =>
    //         {
    //             logRed('Server shutting down with signal=' + sig);
    //             setTimeout(() => { process.exit(1); }, 100);
    //         });
    //     });
    // })();
})();