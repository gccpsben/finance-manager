"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var extendedLog_1 = require("../extendedLog");
var fdbTypes = require("./financeDatabase");
var financeDatabase_1 = require("./financeDatabase");
var fs = require('fs');
var fsp = require("fs/promises");
var jmespath = require('jmespath');
var bcrypt = require('bcrypt');
var fdb = require("./financeDatabase.js");
var financeDbMongoose = fdb.financeDbMongoose;
var expressInstance = undefined;
var shortcuts = require("../supexShortcuts");
exports.initialize = function (express_instance) {
    var _this = this;
    try {
        expressInstance = express_instance;
        expressInstance.get("/api/finance/containers", function (req, res) { return __awaiter(_this, void 0, void 0, function () { var _a, _b; return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = res).json;
                    return [4 /*yield*/, fdbTypes.ContainerClass.getAllContainersTotalBalance()];
                case 1:
                    _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/];
            }
        }); }); });
        expressInstance.get("/api/finance/transactions", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var currencies, allTxs, output, index, tx, _a, _b, _c, _d;
            var _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, financeDatabase_1.AccessTokenClassModel.isRequestAuthenticated(req)];
                    case 1:
                        // Check for permission and login
                        if (!(_f.sent())) {
                            res.status(401).json({});
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, fdbTypes.CurrencyModel.find()];
                    case 2:
                        currencies = _f.sent();
                        return [4 /*yield*/, fdbTypes.TransactionModel.find()];
                    case 3:
                        allTxs = _f.sent();
                        output = [];
                        index = 0;
                        _f.label = 4;
                    case 4:
                        if (!(index < allTxs.length)) return [3 /*break*/, 7];
                        tx = allTxs[index];
                        _b = (_a = output).push;
                        _c = [__assign({}, tx["_doc"])];
                        _e = {};
                        _d = "changeInValue";
                        return [4 /*yield*/, tx.getChangeInValue(currencies)];
                    case 5:
                        _b.apply(_a, [__assign.apply(void 0, _c.concat([(_e[_d] = _f.sent(), _e)]))]);
                        _f.label = 6;
                    case 6:
                        index++;
                        return [3 /*break*/, 4];
                    case 7:
                        res.json(output);
                        return [2 /*return*/];
                }
            });
        }); });
        expressInstance.get("/api/finance/currencies", function (req, res) { return __awaiter(_this, void 0, void 0, function () { var _a, _b; return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = res).json;
                    return [4 /*yield*/, fdbTypes.CurrencyModel.find()];
                case 1:
                    _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/];
            }
        }); }); });
        expressInstance.get("/api/finance/transactionTypes", function (req, res) { return __awaiter(_this, void 0, void 0, function () { var _a, _b; return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = res).json;
                    return [4 /*yield*/, fdbTypes.TransactionTypeModel.find()];
                case 1:
                    _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/];
            }
        }); }); });
        expressInstance.get("/api/finance/summary", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var allTxns, allCurrencies, oneWeekAgoDate, oneMonthAgoDate, hydratedTxns, _a, _b, _c, _i, index, _d, _e, _f, _g, allIncomeTxns, allExpenseTxns, incomeTxns30d, expenseTxns30d, incomeTxns7d, expenseTxns7d, output;
            var _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0: return [4 /*yield*/, fdbTypes.TransactionModel.find()];
                    case 1:
                        allTxns = _j.sent();
                        return [4 /*yield*/, fdbTypes.CurrencyModel.find()];
                    case 2:
                        allCurrencies = _j.sent();
                        oneWeekAgoDate = new Date();
                        oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7);
                        oneMonthAgoDate = new Date();
                        oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);
                        hydratedTxns = [];
                        _a = allTxns;
                        _b = [];
                        for (_c in _a)
                            _b.push(_c);
                        _i = 0;
                        _j.label = 3;
                    case 3:
                        if (!(_i < _b.length)) return [3 /*break*/, 6];
                        _c = _b[_i];
                        if (!(_c in _a)) return [3 /*break*/, 5];
                        index = _c;
                        _e = (_d = hydratedTxns).push;
                        _f = [__assign({}, allTxns[index]["_doc"])];
                        _h = {};
                        _g = "changeInValue";
                        return [4 /*yield*/, (allTxns[index].getChangeInValue(allCurrencies))];
                    case 4:
                        _e.apply(_d, [__assign.apply(void 0, _f.concat([(_h[_g] = _j.sent(), _h)]))]);
                        _j.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        allIncomeTxns = hydratedTxns.filter(function (tx) { return tx.changeInValue > 0; });
                        allExpenseTxns = hydratedTxns.filter(function (tx) { return tx.changeInValue < 0; });
                        incomeTxns30d = allIncomeTxns.filter(function (tx) { return tx.date > oneMonthAgoDate; }).sort(function (b, a) { return b.date - a.date; });
                        expenseTxns30d = allExpenseTxns.filter(function (tx) { return tx.date > oneMonthAgoDate; }).sort(function (b, a) { return b.date - a.date; });
                        incomeTxns7d = allIncomeTxns.filter(function (tx) { return tx.date > oneWeekAgoDate; }).sort(function (b, a) { return b.date - a.date; });
                        expenseTxns7d = allExpenseTxns.filter(function (tx) { return tx.date > oneWeekAgoDate; }).sort(function (b, a) { return b.date - a.date; });
                        output = {
                            "totalIncomes30d": incomeTxns30d.reduce(function (acc, val) { return acc + val.changeInValue; }, 0),
                            "totalExpenses30d": expenseTxns30d.reduce(function (acc, val) { return acc - val.changeInValue; }, 0),
                            "totalIncomes7d": incomeTxns7d.reduce(function (acc, val) { return acc + val.changeInValue; }, 0),
                            "totalExpenses7d": expenseTxns7d.reduce(function (acc, val) { return acc - val.changeInValue; }, 0),
                            "totalIncomes": allIncomeTxns.reduce(function (acc, val) { return acc + val.changeInValue; }, 0),
                            "totalExpenses": allExpenseTxns.reduce(function (acc, val) { return acc - val.changeInValue; }, 0),
                            "incomes30d": incomeTxns30d,
                            "expenses30d": expenseTxns30d
                        };
                        output['totalValue'] = output.totalIncomes - output.totalExpenses;
                        res.json(output);
                        return [2 /*return*/];
                }
            });
        }); });
        expressInstance.post("/api/finance/transactions/add", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var txn, _a, _b, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        txn = new fdbTypes.TransactionModel(req.body);
                        _b = (_a = res).json;
                        return [4 /*yield*/, txn.save()];
                    case 1:
                        _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _c.sent();
                        (0, extendedLog_1.log)(error_1);
                        res.status(400);
                        res.json({ errors: error_1 });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        expressInstance.post("/api/finance/transactions/remove", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var idToRemove, _a, _b, error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        idToRemove = req.body.id;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        _b = (_a = res).json;
                        return [4 /*yield*/, fdbTypes.TransactionModel.findById({ "_id": idToRemove }).deleteOne()];
                    case 2:
                        _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _c.sent();
                        res.status(400);
                        res.json({ errors: error_2.errors });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        expressInstance.post("/api/finance/containers/add", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b, error_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        _b = (_a = res).json;
                        return [4 /*yield*/, new fdbTypes.ContainerModel(req.body).save()];
                    case 1:
                        _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _c.sent();
                        (0, extendedLog_1.log)(error_3);
                        res.status(400);
                        res.json({ errors: error_3 });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        expressInstance.post("/api/finance/containers/remove", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var idToRemove, _a, _b, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        idToRemove = req.body.id;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        _b = (_a = res).json;
                        return [4 /*yield*/, fdbTypes.ContainerModel.findById({ "_id": idToRemove }).deleteOne()];
                    case 2:
                        _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _c.sent();
                        res.status(400);
                        res.json({ errors: error_4.errors });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        expressInstance.post("/api/finance/charts/totalValue", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b, error_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        _b = (_a = res).json;
                        return [4 /*yield*/, fdbTypes.TotalValueRecordModel.find({})];
                    case 1:
                        _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _c.sent();
                        res.status(400);
                        res.json({ errors: error_5.errors });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        expressInstance.post("/api/finance/login", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var accessToken, jwtToken, _a, ex_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, financeDatabase_1.AccountClass.login(req.body.username, req.body.password, req.get("User-Agent"))];
                    case 1:
                        accessToken = _b.sent();
                        _a = "Bearer ";
                        return [4 /*yield*/, accessToken.generateJWTBearer()];
                    case 2:
                        jwtToken = _a + (_b.sent());
                        res.json({ "token": jwtToken });
                        return [3 /*break*/, 4];
                    case 3:
                        ex_1 = _b.sent();
                        if (ex_1 == "Username or password don't match") {
                            res.status(401);
                            res.json({ "error": ex_1 });
                            return [2 /*return*/];
                        }
                        res.status(400);
                        res.json({ "error": ex_1 });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        express_instance.post("/api/finance/accounts/register", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var newlyCreatedAccount, ex_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, financeDatabase_1.AccountClassModel.register(req.body.username, req.body.password)];
                    case 1:
                        newlyCreatedAccount = _a.sent();
                        res.json({
                            username: newlyCreatedAccount.username,
                            id: newlyCreatedAccount["_id"]
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        ex_2 = _a.sent();
                        console.log(ex_2);
                        res.status(400);
                        res.json({ "error": ex_2 });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Update stats every hour
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var updateFunc;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateFunc = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, fdbTypes.TotalValueRecordClass.UpdateHistory()];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        }); }); };
                        setInterval(updateFunc, 60000 * 30);
                        return [4 /*yield*/, updateFunc()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); })();
        // Update rate from coingecko every 30 min
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var updateFunc;
            var _this = this;
            return __generator(this, function (_a) {
                updateFunc = function () { return __awaiter(_this, void 0, void 0, function () {
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fdbTypes.CurrencyModel.find()];
                            case 1:
                                (_a.sent()).forEach(function (currency) {
                                    if (currency.dataSource == undefined)
                                        return;
                                    var options = {
                                        method: 'GET',
                                        hostname: currency.dataSource.jsonURLHost, port: null, path: currency.dataSource.jsonURLPath
                                    };
                                    var isNum = function (num) { return (typeof (num) === 'number' || typeof (num) === "string" && num.trim() !== '') && !isNaN(num); };
                                    var onError = function (err, e) { (0, extendedLog_1.logRed)("Error while fetching ".concat(currency.dataSource, " for ").concat(currency.symbol, ": ").concat(JSON.stringify(err))); };
                                    var onClose = function (wholeData) { return __awaiter(_this, void 0, void 0, function () {
                                        var json, value, fullPath, error_6;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 5, , 6]);
                                                    json = JSON.parse(wholeData);
                                                    value = jmespath.search(json, currency.dataSource.jmesQuery);
                                                    fullPath = "".concat(currency.dataSource.jsonURLHost).concat(currency.dataSource.jsonURLPath);
                                                    if (!(value == undefined)) return [3 /*break*/, 1];
                                                    (0, extendedLog_1.logRed)("The query \"".concat(currency.dataSource.jmesQuery, "\" returned from ").concat(fullPath, " for ").concat(currency.symbol, " is undefined."));
                                                    return [3 /*break*/, 4];
                                                case 1:
                                                    if (!!isNum(value)) return [3 /*break*/, 2];
                                                    (0, extendedLog_1.logRed)("The query \"".concat(currency.dataSource.jmesQuery, "\" returned from ").concat(fullPath, " for ").concat(currency.symbol, " is not a number. (").concat(JSON.stringify(value), ")"));
                                                    return [3 /*break*/, 4];
                                                case 2:
                                                    (0, extendedLog_1.logGreen)("Successfully fetched ".concat(currency.symbol, " price ").concat(value, "."));
                                                    currency.rate = value;
                                                    return [4 /*yield*/, currency.save()];
                                                case 3:
                                                    _a.sent();
                                                    _a.label = 4;
                                                case 4: return [3 /*break*/, 6];
                                                case 5:
                                                    error_6 = _a.sent();
                                                    if (wholeData.includes("502"))
                                                        return [2 /*return*/];
                                                    (0, extendedLog_1.logRed)("Error while fetching ".concat(currency.dataSource, " for ").concat(currency.symbol, ": ").concat(wholeData));
                                                    (0, extendedLog_1.logRed)(error_6);
                                                    return [3 /*break*/, 6];
                                                case 6: return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    setTimeout(function () { shortcuts.httpsRequest(options, undefined, onClose, onError); }, 5000 * Math.random());
                                });
                                return [2 /*return*/];
                        }
                    });
                }); };
                setInterval(updateFunc, 60000 * 60);
                updateFunc();
                return [2 /*return*/];
            });
        }); })();
        // Sync wallets transactions from blockchain every 30 min
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var syncWalletFunc;
            var _this = this;
            return __generator(this, function (_a) {
                syncWalletFunc = function () { return __awaiter(_this, void 0, void 0, function () {
                    var allWatchdogs, cache, watchdogIndex, watchdog, txAdded;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fdbTypes.CryptoWalletWatchDogModel.find()];
                            case 1:
                                allWatchdogs = (_a.sent());
                                return [4 /*yield*/, fdbTypes.DataCache.ensure()];
                            case 2:
                                cache = _a.sent();
                                watchdogIndex = 0;
                                _a.label = 3;
                            case 3:
                                if (!(watchdogIndex < allWatchdogs.length)) return [3 /*break*/, 6];
                                watchdog = allWatchdogs[watchdogIndex];
                                return [4 /*yield*/, watchdog.synchronizeAllTokens(cache)];
                            case 4:
                                txAdded = _a.sent();
                                if (txAdded.length > 0)
                                    (0, extendedLog_1.logGreen)("".concat(txAdded.length, " txns added for container=").concat(watchdog.linkedContainerID, " from blockchain"));
                                _a.label = 5;
                            case 5:
                                watchdogIndex++;
                                return [3 /*break*/, 3];
                            case 6: return [2 /*return*/];
                        }
                    });
                }); };
                setInterval(syncWalletFunc, 60000 * 30);
                syncWalletFunc();
                return [2 /*return*/];
            });
        }); })();
    }
    catch (e) {
        (0, extendedLog_1.logRed)(e);
    }
};
