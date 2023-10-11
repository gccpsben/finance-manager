'use strict'

import * as dotenv from 'dotenv';
import { logGreen, logRed, logBlue, getLog, logYellow, log } from "./extendedLog";
import * as Express from 'express';
import * as fs from 'fs';

let minify = require('express-minify');
let envFilePath = process.argv[2] || ".env";
require('dotenv-expand').expand(dotenv.config({path: envFilePath})); // load env and expand using dotenv-expand

export let isDevelopment = process.env.NODE_ENV == "development" || process.env.NODE_ENV == "dev"
log(`env file loaded from ${envFilePath}`);

(isDevelopment ? logRed : logGreen)(`Running with isDevelopment=${isDevelopment}`);

// #region SSL
let isSSLDefined = process.env.SSL_KEY_PATH && process.env.SSL_PEM_PATH;
let sslKey:Buffer, sslCert:Buffer;
if (!isSSLDefined) logYellow("SSL_KEY_PATH or SSL_PEM_PATH isn't defined in the env file. Running in HTTP mode.");
else 
{ 
    sslKey = fs.readFileSync(process.cwd() + process.env.SSL_KEY_PATH);
    sslCert = fs.readFileSync(process.cwd() + process.env.SSL_PEM_PATH);
    logGreen("Running in HTTPS mode.");
}
// #endregion 

let app = Express();
let server = isSSLDefined ? require('https').createServer({ key:sslKey, cert:sslCert }, app) : require('http').createServer(app);
let port = process.env.PORT || 55561;
let systemLaunchTime = new Date();
let distFolderLocation = require('node:path').resolve(process.env.DIST_FOLDER ?? "./dist/");
if (process.env.DIST_FOLDER == undefined) logYellow("Warning: DIST_FOLDER isn't defined in the env file.");

// initialization
(async function () 
{
    logBlue(`Static folder set to ${distFolderLocation}`);

    // Finance Database Setup
    await require("./database").init(process.env.FINANCE_DB_FULL_URL);

    app.use(minify());
    app.use(Express.json());
    app.use(require('express-useragent').express());
    server.listen(port, () => { logGreen(`Started listening on ${port}`); });

    // Router definitions
    (function()
    {
        app.get("/api/", (req:any, res:any) => { res.json({message:"welcome to the entry API"}); });
        app.get("/api/", (req:any, res:any) => { res.json({message:"welcome to the entry API"}); });
        app.get("/api/systemLaunchTime", (req:any, res:any) => { res.json({launchTime:systemLaunchTime}); });
        app.get("/api/pastLog", (req:any, res:any) => 
        { 
            if (req.query.lines) { res.json(getLog(Number.parseInt(req.query.lines))); }
            else { res.json(getLog()); }
        });
    })();

    // Finance module
    (function() 
    {
        let financeEndpoints = require('./finance/financeEndpoints');
        financeEndpoints.initialize(app); 
    })();

    // Catching signals and logging them
    (function()
    {
        ['SIG', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT','SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'].forEach(sig =>
        {
            process.on(sig, () =>
            {
                logRed('Server shutting down with signal=' + sig);
                setTimeout(() => { process.exit(1); }, 100);
            });
        });
    })();

    app.use(Express.static(distFolderLocation));
    expressRouterGet("/assets/*", (req, res) => { res.sendFile(req.path, { root: distFolderLocation }); }, false);
    expressRouterGet("/*", (req, res) => { res.sendFile("index.html", { root: distFolderLocation }); }, false);
})();

// Methods definitions
function expressRouterGet(path: string, callback: any, requireLocalhost: any)
{
    if (!callback) { console.warn("callback is null."); return; }
    if (!path) { console.warn("path is null."); return; }

    app.get(path, function (req, res, next)
    {
        let acceptedSource = 
        [
            "::1",
            "::ffff:127.0.0.1",
            "localhost"
        ];

        // Handle access of local resources from remote.
        if (!acceptedSource.includes(req.connection.remoteAddress) && requireLocalhost)
        {
            logRed(`Requests of "${path}" from ${req.connection.remoteAddress} was rejected.`);
            res.status(403).send(`<html><body>Access denied. Access must originate from <a href='http://localhost:${port}/accessRecordRaw'>localhost</a>. Current source: ${req.connection.remoteAddress}</body></html>`); 
        }
        else callback(req, res, next); 
    });
}