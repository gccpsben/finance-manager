'use strict'

import { logGreen, logRed, log, logBlue, getLog } from "./extendedLog";
const Express = require("express");
var fs = require("fs");
var minify = require('express-minify');
require('dotenv-expand').expand(require('dotenv').config()); // load env and expand using dotenv-expand

// #region SSL
var isSSLDefined = process.env.SSL_KEY_PATH && process.env.SSL_PEM_PATH;
var sslKey, sslCert;
if (!isSSLDefined) console.log("SSL_KEY_PATH or SSL_PEM_PATH isn't defined in the env file. Running in HTTP mode.");
else 
{ 
    sslKey = fs.readFileSync(process.cwd() + process.env.SSL_KEY_PATH);
    sslCert = fs.readFileSync(process.cwd() + process.env.SSL_PEM_PATH);
    console.log("Running in HTTPS mode.");
}
// #endregion 

var app = Express();
var server = isSSLDefined ? require('https').createServer({ key:sslKey, cert:sslCert }, app) : require('http').createServer(app);
var port = process.env.PORT || 55561;
var systemLaunchTime = new Date();

// initialization
(async function () 
{
    //#region Finance Database Setup
    await require("./database").init(process.env.FINANCE_DB_FULL_URL);
    //#endregion

    app.use(minify());
    app.use(Express.json());
    app.use(Express.static("./dist/"));
    app.use(require('express-useragent').express());
    server.listen(port, () => { logGreen(`Started listening on ${port}`); });

    // Router definitions
    (function()
    {
        app.get("/api/", (req:any, res:any) => { res.json({message:"welcome to the entry API"}); });
        app.get("/assets/*", (req:any, res:any) => { res.sendFile(`${req.path}`.replace("/assets/",""), {root: "./src/assets/"});} );
        app.get("/api/", (req:any, res:any) => { res.json({message:"welcome to the entry API"}); });
        app.get("/api/systemLaunchTime", (req:any, res:any) => { res.json({launchTime:systemLaunchTime}); });
        app.get("/api/pastLog", (req:any, res:any) => 
        { 
            if (req.query.lines) { res.json(getLog(Number.parseInt(req.query.lines))); }
            else { res.json(getLog()); }
        });
    })();

    // Finance module
    var financeModule = require("./finance/financeModule");
    (function() { financeModule.initialize(app); })();

    // Catching signals and logging them
    (function()
    {
        ['SIG', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT','SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'].forEach(function (sig)
        {
            process.on(sig, function ()
            {
                logRed('Server shutting down with signal=' + sig);

                setTimeout(function ()
                { process.exit(1); }, 100);
            });
        });
    })();

    expressRouterGet("/*", function (req, res, next) { res.sendFile("index.html", {root: "./dist/"}); }, false);

})();

// Methods definitions
function expressRouterGet(path: string, callback: any, requireLocalhost: any)
{
    if (!callback) { console.warn("callback is null."); return; }
    if (!path) { console.warn("path is null."); return; }

    app.get(path, function (req, res, next)
    {
        var acceptedSource = 
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
        else 
        {
            callback(req, res, next); 
        }
    });
}