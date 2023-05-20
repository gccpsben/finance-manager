'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var extendedLog_1 = require("./extendedLog");
var Express = require("express");
var fs = require("fs");
var minify = require('express-minify');
require('dotenv').config(); // load env
// #region SSL
if (!process.env.SSL_KEY_PATH || !process.env.SSL_PEM_PATH)
    console.log("SSL_KEY_PATH or SSL_PEM_PATH isn't defined in the env file.");
var key = fs.readFileSync(process.cwd() + process.env.SSL_KEY_PATH);
var cert = fs.readFileSync(process.cwd() + process.env.SSL_PEM_PATH);
// #endregion 
var app = Express();
//var server = require('https').createServer({ key:key, cert:cert }, app);
var server = require('http').createServer(app);
var port = process.env.PORT || 55561;
var systemLaunchTime = new Date();
// initialization
(function () {
    return __awaiter(this, void 0, void 0, function () {
        var financeModule;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                //#region Finance Database Setup
                return [4 /*yield*/, require("./database").init("".concat(process.env.FINANCE_DB_PROTOCAL, "://").concat(process.env.FINANCE_DB_USERNAME, ":").concat(process.env.FINANCE_DB_PASSWORD, "@").concat(process.env.FINANCE_DB_HOST))];
                case 1:
                    //#region Finance Database Setup
                    _a.sent();
                    //#endregion
                    app.use(minify());
                    app.use(Express.json());
                    app.use(Express.static("./dist/"));
                    app.use(require('express-useragent').express());
                    server.listen(port, function () { (0, extendedLog_1.logGreen)("Started listening on ".concat(port)); });
                    // Router definitions
                    (function () {
                        app.get("/api/", function (req, res) { res.json({ message: "welcome to the entry API" }); });
                        app.get("/assets/*", function (req, res) { res.sendFile("".concat(req.path).replace("/assets/", ""), { root: "./src/assets/" }); });
                        app.get("/api/", function (req, res) { res.json({ message: "welcome to the entry API" }); });
                        app.get("/api/systemLaunchTime", function (req, res) { res.json({ launchTime: systemLaunchTime }); });
                        app.get("/api/pastLog", function (req, res) {
                            if (req.query.lines) {
                                res.json((0, extendedLog_1.getLog)(Number.parseInt(req.query.lines)));
                            }
                            else {
                                res.json((0, extendedLog_1.getLog)());
                            }
                        });
                    })();
                    financeModule = require("./finance/financeModule");
                    (function () { financeModule.initialize(app); })();
                    // Catching signals and logging them
                    (function () {
                        ['SIG', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'].forEach(function (sig) {
                            process.on(sig, function () {
                                (0, extendedLog_1.logRed)('Server shutting down with signal=' + sig);
                                setTimeout(function () { process.exit(1); }, 100);
                            });
                        });
                    })();
                    expressRouterGet("/*", function (req, res, next) { res.sendFile("index.html", { root: "./dist/" }); }, false);
                    return [2 /*return*/];
            }
        });
    });
})();
// Methods definitions
function expressRouterGet(path, callback, requireLocalhost) {
    if (!callback) {
        console.warn("callback is null.");
        return;
    }
    if (!path) {
        console.warn("path is null.");
        return;
    }
    app.get(path, function (req, res, next) {
        var acceptedSource = [
            "::1",
            "::ffff:127.0.0.1",
            "localhost"
        ];
        // Handle access of local resources from remote.
        if (!acceptedSource.includes(req.connection.remoteAddress) && requireLocalhost) {
            (0, extendedLog_1.logRed)("Requests of \"".concat(path, "\" from ").concat(req.connection.remoteAddress, " was rejected."));
            res.status(403).send("<html><body>Access denied. Access must originate from <a href='http://localhost:".concat(port, "/accessRecordRaw'>localhost</a>. Current source: ").concat(req.connection.remoteAddress, "</body></html>"));
        }
        else {
            callback(req, res, next);
        }
    });
}
