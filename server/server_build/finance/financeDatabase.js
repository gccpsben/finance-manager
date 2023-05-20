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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
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
exports.AccessTokenClassModel = exports.AccessTokenClass = exports.AccountClassModel = exports.AccountClass = exports.FinanceHistory = exports.TotalValueRecordModel = exports.TotalValueRecordClass = exports.CryptoWalletWatchDogModel = exports.CryptoWalletWatchDogClass = exports.WalletTokenModel = exports.WalletTokenClass = exports.CurrencyModel = exports.CurrencyClass = exports.CurrencyDataSourceModel = exports.CurrencyDataSourceClass = exports.TransactionTypeModel = exports.TransactionTypeClass = exports.ContainerModel = exports.ContainerClass = exports.TransactionModel = exports.TransactionClass = exports.ContainerBoundAmountModel = exports.ContainerBoundAmountClass = exports.AmountModel = exports.AmountClass = exports.DataCache = void 0;
var typegoose_1 = require("@typegoose/typegoose");
var uuid_1 = require("uuid");
var mongoose_1 = require("mongoose");
var extendedLog_1 = require("../extendedLog");
var axios_1 = require("axios");
var bcrypt = require('bcrypt');
var saltRounds = 10;
var jwtSecret = process.env.JWT_SECRET;
var jwt = require("jsonwebtoken");
var databaseToUse = "finance";
var mongoWrapper = require("../database");
var mongoClient = mongoWrapper.client;
var financeDb = mongoClient.db(databaseToUse);
var financeDbMongoose = mongoWrapper.mongooseClient.useDb(databaseToUse);
var txCollection = financeDb.collection("transactions");
exports.mongoWrapper = mongoWrapper;
exports.mongoClient = mongoClient;
exports.financeDb = financeDb;
exports.financeDbMongoose = financeDbMongoose;
exports.txCollection = txCollection;
var DataCache = /** @class */ (function () {
    function DataCache() {
    }
    // Ensure that all properties in this class are fetched from the database.
    DataCache.ensure = function (cache) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (cache == undefined)
                            cache = new DataCache();
                        if (!(cache.allContainers == undefined)) return [3 /*break*/, 2];
                        _a = cache;
                        return [4 /*yield*/, exports.ContainerModel.find()];
                    case 1:
                        _a.allContainers = _e.sent(); // fetch all containers from db
                        _e.label = 2;
                    case 2:
                        if (!(cache.allCurrencies == undefined)) return [3 /*break*/, 4];
                        _b = cache;
                        return [4 /*yield*/, exports.CurrencyModel.find()];
                    case 3:
                        _b.allCurrencies = _e.sent(); // fetch all currencies from db
                        _e.label = 4;
                    case 4:
                        if (!(cache.allTransactions == undefined)) return [3 /*break*/, 6];
                        _c = cache;
                        return [4 /*yield*/, exports.TransactionModel.find()];
                    case 5:
                        _c.allTransactions = _e.sent(); // fetch all transactions from db
                        _e.label = 6;
                    case 6:
                        if (!(cache.allTransactionTypes == undefined)) return [3 /*break*/, 8];
                        _d = cache;
                        return [4 /*yield*/, exports.TransactionTypeModel.find()];
                    case 7:
                        _d.allTransactionTypes = _e.sent(); // fetch all types from db
                        _e.label = 8;
                    case 8: // fetch all types from db
                    return [2 /*return*/, cache];
                }
            });
        });
    };
    return DataCache;
}());
exports.DataCache = DataCache;
var AmountClass = /** @class */ (function () {
    function AmountClass() {
    }
    // If you wish not to fetch currencies from db again, provide a list of all currencies.
    AmountClass.prototype.getValue = function (allCurrencies) {
        return __awaiter(this, void 0, void 0, function () {
            var respectiveCurrency;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(allCurrencies == undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, exports.CurrencyModel.findOne({ _id: this.currencyID })];
                    case 1:
                        respectiveCurrency = _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        respectiveCurrency = allCurrencies.find(function (c) { var _a; return ((_a = c._id) === null || _a === void 0 ? void 0 : _a.toString()) == _this.currencyID; });
                        _a.label = 3;
                    case 3:
                        if (respectiveCurrency)
                            return [2 /*return*/, respectiveCurrency.rate * this.value];
                        else
                            throw new Error("Currency with ID=".concat(this.currencyID, " is not found."));
                        return [2 /*return*/];
                }
            });
        });
    };
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], AmountClass.prototype, "currencyID");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Number)
    ], AmountClass.prototype, "value");
    AmountClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { autoCreate: false, _id: false }, existingConnection: financeDbMongoose })
    ], AmountClass);
    return AmountClass;
}());
exports.AmountClass = AmountClass;
exports.AmountModel = (0, typegoose_1.getModelForClass)(AmountClass);
var ContainerBoundAmountClass = /** @class */ (function () {
    function ContainerBoundAmountClass() {
    }
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], ContainerBoundAmountClass.prototype, "containerID");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", AmountClass)
    ], ContainerBoundAmountClass.prototype, "amount");
    ContainerBoundAmountClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { autoCreate: false, _id: false }, existingConnection: financeDbMongoose })
    ], ContainerBoundAmountClass);
    return ContainerBoundAmountClass;
}());
exports.ContainerBoundAmountClass = ContainerBoundAmountClass;
exports.ContainerBoundAmountModel = (0, typegoose_1.getModelForClass)(ContainerBoundAmountClass);
var TransactionClass = /** @class */ (function () {
    function TransactionClass() {
    }
    // If you wish not to fetch currencies from db again, provide a list of all currencies.
    TransactionClass.prototype.getChangeInValue = function (allCurrencies) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(this.from == undefined && this.to != undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.to.amount.getValue(allCurrencies)];
                    case 1: return [2 /*return*/, _b.sent()];
                    case 2:
                        if (!(this.from != undefined && this.to != undefined)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.to.amount.getValue(allCurrencies)];
                    case 3:
                        _a = (_b.sent());
                        return [4 /*yield*/, this.from.amount.getValue(allCurrencies)];
                    case 4: return [2 /*return*/, _a - (_b.sent())];
                    case 5:
                        if (!(this.from != undefined && this.to == undefined)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.from.amount.getValue(allCurrencies)];
                    case 6: return [2 /*return*/, (_b.sent()) * -1];
                    case 7: return [2 /*return*/, 0];
                }
            });
        });
    };
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Date)
    ], TransactionClass.prototype, "date");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], TransactionClass.prototype, "title");
    __decorate([
        (0, typegoose_1.prop)({ required: false }),
        __metadata("design:type", String)
    ], TransactionClass.prototype, "description");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], TransactionClass.prototype, "typeID");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Boolean)
    ], TransactionClass.prototype, "isFromBot");
    __decorate([
        (0, typegoose_1.prop)({ required: false }),
        __metadata("design:type", ContainerBoundAmountClass)
    ], TransactionClass.prototype, "from");
    __decorate([
        (0, typegoose_1.prop)({ required: false }),
        __metadata("design:type", ContainerBoundAmountClass)
    ], TransactionClass.prototype, "to");
    TransactionClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { collection: "transactions" }, existingConnection: financeDbMongoose })
    ], TransactionClass);
    return TransactionClass;
}());
exports.TransactionClass = TransactionClass;
exports.TransactionModel = (0, typegoose_1.getModelForClass)(TransactionClass);
var ContainerClass = /** @class */ (function () {
    function ContainerClass() {
    }
    // cached results can be provided to speed up the function.
    ContainerClass.prototype.getTotalBalance = function (cache) {
        return __awaiter(this, void 0, void 0, function () {
            var output;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this["_id"] == undefined)
                            throw new Error("This container doesn't exist in the database. Save it before calling this function.");
                        return [4 /*yield*/, DataCache.ensure(cache)];
                    case 1:
                        cache = _a.sent();
                        output = { id: this["_id"], balance: {}, value: 0 };
                        cache.allTransactions.forEach(function (tx) {
                            // Add balance if defined.
                            if (tx.to != undefined && tx.to != null) {
                                // Check if the transaction relates to the current container:
                                if (tx.to.containerID == _this["_id"].toString()) {
                                    var cID = tx.to.amount.currencyID;
                                    var respectiveCurrency = cache.allCurrencies.find(function (x) { return x["_id"].toString() == cID; });
                                    if (cID in output.balance)
                                        output.balance[cID] += tx.to.amount.value;
                                    else
                                        output.balance[cID] = tx.to.amount.value;
                                    // Calculate value change
                                    if (respectiveCurrency != undefined)
                                        output.value += respectiveCurrency.rate * tx.to.amount.value;
                                }
                            }
                            // Subtract balance if defined.
                            if (tx.from != undefined && tx.from != null) {
                                // Check if the transaction relates to the current container:
                                if (tx.from.containerID == _this["_id"].toString()) {
                                    var cID = tx.from.amount.currencyID;
                                    var respectiveCurrency = cache.allCurrencies.find(function (x) { return x["_id"].toString() == cID; });
                                    var cID = tx.from.amount.currencyID;
                                    if (cID in output.balance)
                                        output.balance[cID] -= tx.from.amount.value;
                                    else
                                        output.balance[cID] = tx.from.amount.value * -1;
                                    // Calculate value change
                                    if (respectiveCurrency != undefined)
                                        output.value -= respectiveCurrency.rate * tx.from.amount.value;
                                }
                            }
                        });
                        return [2 /*return*/, output];
                }
            });
        });
    };
    // cached results can be provided to speed up the function.
    ContainerClass.getAllContainersTotalBalance = function (cache) {
        return __awaiter(this, void 0, void 0, function () {
            var output, i, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        // find all containers, currencies and transactions
                        if (cache == undefined)
                            cache = new DataCache();
                        return [4 /*yield*/, DataCache.ensure(cache)];
                    case 1:
                        _d.sent();
                        output = [];
                        i = 0;
                        _d.label = 2;
                    case 2:
                        if (!(i < cache.allContainers.length)) return [3 /*break*/, 5];
                        _b = (_a = output).push;
                        _c = [{}];
                        return [4 /*yield*/, cache.allContainers[i].getTotalBalance(cache)];
                    case 3:
                        _b.apply(_a, [__assign.apply(void 0, [__assign.apply(void 0, _c.concat([_d.sent()])), { "name": cache.allContainers[i].name, "ownersID": cache.allContainers[i].ownersID }])]);
                        _d.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, output];
                }
            });
        });
    };
    __decorate([
        (0, typegoose_1.prop)({ type: String, required: true }),
        __metadata("design:type", String)
    ], ContainerClass.prototype, "name");
    __decorate([
        (0, typegoose_1.prop)({ type: String, required: true, "default": [] }),
        __metadata("design:type", mongoose_1["default"].Types.Array)
    ], ContainerClass.prototype, "ownersID");
    ContainerClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { collection: "containers" }, existingConnection: financeDbMongoose })
    ], ContainerClass);
    return ContainerClass;
}());
exports.ContainerClass = ContainerClass;
exports.ContainerModel = (0, typegoose_1.getModelForClass)(ContainerClass);
var TransactionTypeClass = /** @class */ (function () {
    function TransactionTypeClass() {
    }
    __decorate([
        (0, typegoose_1.prop)({ required: false }),
        __metadata("design:type", mongoose_1["default"].Types.ObjectId)
    ], TransactionTypeClass.prototype, "_id");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], TransactionTypeClass.prototype, "name");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Boolean)
    ], TransactionTypeClass.prototype, "isEarning");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Boolean)
    ], TransactionTypeClass.prototype, "isExpense");
    TransactionTypeClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { collection: "transactionTypes" }, existingConnection: financeDbMongoose })
    ], TransactionTypeClass);
    return TransactionTypeClass;
}());
exports.TransactionTypeClass = TransactionTypeClass;
exports.TransactionTypeModel = (0, typegoose_1.getModelForClass)(TransactionTypeClass);
var CurrencyDataSourceClass = /** @class */ (function () {
    function CurrencyDataSourceClass() {
    }
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], CurrencyDataSourceClass.prototype, "jsonURLHost");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], CurrencyDataSourceClass.prototype, "jsonURLPath");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], CurrencyDataSourceClass.prototype, "jmesQuery");
    CurrencyDataSourceClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { autoCreate: false, _id: false }, existingConnection: financeDbMongoose })
    ], CurrencyDataSourceClass);
    return CurrencyDataSourceClass;
}());
exports.CurrencyDataSourceClass = CurrencyDataSourceClass;
exports.CurrencyDataSourceModel = (0, typegoose_1.getModelForClass)(CurrencyDataSourceClass);
var CurrencyClass = /** @class */ (function () {
    function CurrencyClass() {
    }
    __decorate([
        (0, typegoose_1.prop)({ required: false }),
        __metadata("design:type", mongoose_1["default"].Types.ObjectId)
    ], CurrencyClass.prototype, "_id");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], CurrencyClass.prototype, "name");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], CurrencyClass.prototype, "symbol");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Number)
    ], CurrencyClass.prototype, "rate");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", CurrencyDataSourceClass)
    ], CurrencyClass.prototype, "dataSource");
    CurrencyClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { collection: "currencies" }, existingConnection: financeDbMongoose })
    ], CurrencyClass);
    return CurrencyClass;
}());
exports.CurrencyClass = CurrencyClass;
exports.CurrencyModel = (0, typegoose_1.getModelForClass)(CurrencyClass);
var WalletTokenClass = /** @class */ (function () {
    function WalletTokenClass() {
    }
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], WalletTokenClass.prototype, "publicAddress");
    __decorate([
        (0, typegoose_1.prop)({ required: true, "enum": ["BTC", "LTC"] }),
        __metadata("design:type", String)
    ], WalletTokenClass.prototype, "chainType");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], WalletTokenClass.prototype, "currencyID");
    WalletTokenClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { autoCreate: false, _id: false }, existingConnection: financeDbMongoose })
    ], WalletTokenClass);
    return WalletTokenClass;
}());
exports.WalletTokenClass = WalletTokenClass;
exports.WalletTokenModel = (0, typegoose_1.getModelForClass)(WalletTokenClass);
var CryptoWalletWatchDogClass = /** @class */ (function () {
    function CryptoWalletWatchDogClass() {
    }
    // returns a list of newly added tx.
    CryptoWalletWatchDogClass.prototype.synchronizeAllTokens = function (cache) {
        return __awaiter(this, void 0, void 0, function () {
            // Check for a transaction already added.
            // If it's not added already, append and save them to the database, and return the TransactionClass created.
            // Will return undefined if no transaction was added.
            function tryAppendTxn(dateOfTransaction, nativeAmount, txType, token) {
                return __awaiter(this, void 0, void 0, function () {
                    var txAmountString, keyToMatch, recordFound, transactionBodyToAdd, newlyAddedTx;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                txAmountString = nativeAmount.toFixed(9);
                                keyToMatch = txType == "Receive" ? "to" : "from";
                                recordFound = cache.allTransactions.some(function (savedTransaction) {
                                    var isDateMatch = new Date(savedTransaction.date).toISOString() == dateOfTransaction.toISOString();
                                    if (!isDateMatch)
                                        return false;
                                    if (savedTransaction[keyToMatch] == undefined)
                                        return false;
                                    if (savedTransaction[keyToMatch].amount.value != Number.parseFloat(txAmountString))
                                        return false;
                                    if (savedTransaction[keyToMatch].containerID != self.linkedContainerID)
                                        return false;
                                    return true;
                                });
                                if (!!recordFound) return [3 /*break*/, 2];
                                (0, extendedLog_1.log)("CryptoWalletWatchDog: Added Tx from ".concat(dateOfTransaction.toISOString(), " of ").concat(token.publicAddress));
                                transactionBodyToAdd = {
                                    "title": "".concat(token.chainType, " Transaction"),
                                    "typeID": self.defaultTransactionTypeID,
                                    "date": dateOfTransaction.toISOString(),
                                    "isFromBot": true
                                };
                                transactionBodyToAdd[keyToMatch] =
                                    {
                                        containerID: self.linkedContainerID,
                                        amount: {
                                            currencyID: token.currencyID,
                                            value: Number.parseFloat(txAmountString)
                                        }
                                    };
                                return [4 /*yield*/, new exports.TransactionModel(transactionBodyToAdd).save()];
                            case 1:
                                newlyAddedTx = (_a.sent());
                                return [2 /*return*/, newlyAddedTx];
                            case 2: return [2 /*return*/, undefined];
                        }
                    });
                });
            }
            // returns a list of newly added tx.
            function syncBTCish(token) {
                return __awaiter(this, void 0, void 0, function () {
                    var addedTxns, fetchResponse, response, txIndex, txref, addedTx;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(token.chainType == "LTC" || token.chainType == "BTC")) return [3 /*break*/, 7];
                                addedTxns = [];
                                return [4 /*yield*/, axios_1["default"].get("https://api.blockcypher.com/v1/".concat(token.chainType.toLowerCase(), "/main/addrs/").concat(token.publicAddress))];
                            case 1:
                                fetchResponse = _a.sent();
                                if (fetchResponse.status != 200) {
                                    (0, extendedLog_1.logRed)("Error fetching blockchain data for watchdog id=".concat(self._id, ": E").concat(response.status, ": ").concat(response.body));
                                    return [2 /*return*/, []];
                                }
                                return [4 /*yield*/, fetchResponse.data];
                            case 2:
                                response = _a.sent();
                                if (response.txrefs == undefined)
                                    return [2 /*return*/, []];
                                txIndex = 0;
                                _a.label = 3;
                            case 3:
                                if (!(txIndex < response.txrefs.length)) return [3 /*break*/, 6];
                                txref = response.txrefs[txIndex];
                                if (!(txref.confirmations >= 10 && txref.confirmed != undefined)) return [3 /*break*/, 5];
                                return [4 /*yield*/, tryAppendTxn(new Date(txref.confirmed), txref.value * 0.00000001, txref.spent == undefined ? "Spent" : "Receive", token)];
                            case 4:
                                addedTx = _a.sent();
                                if (addedTx != undefined)
                                    addedTxns.push(addedTx);
                                _a.label = 5;
                            case 5:
                                txIndex++;
                                return [3 /*break*/, 3];
                            case 6: return [2 /*return*/, addedTxns];
                            case 7: throw new Error("The given token is not on the BTC or LTC chain.");
                        }
                    });
                });
            }
            // returns a list of newly added tx.
            function syncXNO(token) {
                return __awaiter(this, void 0, void 0, function () {
                    var addedTxns, fetchResponse, response, allTransactions, i, item, addedTx;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(token.chainType == "XNO")) return [3 /*break*/, 9];
                                addedTxns = [];
                                return [4 /*yield*/, axios_1["default"].post("https://www.nanolooker.com/api/rpc", {
                                        "action": "account_history",
                                        "account": token.publicAddress,
                                        "count": "9999"
                                    })];
                            case 1:
                                fetchResponse = _a.sent();
                                if (fetchResponse.status != 200) {
                                    (0, extendedLog_1.logRed)("Error fetching blockchain data for watchdog id=".concat(self._id, ": E").concat(response.status, ": ").concat(response.body));
                                    return [2 /*return*/, []];
                                }
                                return [4 /*yield*/, fetchResponse.data];
                            case 2:
                                response = _a.sent();
                                if (!(response.error == "Bad account number")) return [3 /*break*/, 3];
                                (0, extendedLog_1.logRed)("Error fetching blockchain data for watchdog id=".concat(self._id, ": of chain XNO: The given public address ").concat(token.publicAddress, " cannot be found."));
                                return [2 /*return*/, []];
                            case 3:
                                if (!(response.error != undefined)) return [3 /*break*/, 4];
                                (0, extendedLog_1.logRed)("Error fetching blockchain data for watchdog id=".concat(self._id, ": of chain XNO: ").concat(response.error));
                                return [2 /*return*/, []];
                            case 4:
                                allTransactions = response.history;
                                i = 0;
                                _a.label = 5;
                            case 5:
                                if (!(i < allTransactions.length)) return [3 /*break*/, 8];
                                item = allTransactions[i];
                                if (!(item["confirmed"] == "true")) return [3 /*break*/, 7];
                                return [4 /*yield*/, tryAppendTxn(new Date(Number.parseInt(item["local_timestamp"]) * 1000), Number.parseInt(item["amount"]) / 10e+29, item["type"] == "receive" ? "Receive" : "Spent", token)];
                            case 6:
                                addedTx = _a.sent();
                                if (addedTx != undefined)
                                    addedTxns.push(addedTx);
                                _a.label = 7;
                            case 7:
                                i++;
                                return [3 /*break*/, 5];
                            case 8: return [2 /*return*/, addedTxns];
                            case 9: throw new Error("The given token is not on the XNO chain.");
                        }
                    });
                });
            }
            var self, txAdded, tokenIndex, tokenToSync, _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, DataCache.ensure(cache)];
                    case 1:
                        cache = _e.sent();
                        self = this;
                        txAdded = [];
                        tokenIndex = 0;
                        _e.label = 2;
                    case 2:
                        if (!(tokenIndex < this.tokensSupported.length)) return [3 /*break*/, 7];
                        tokenToSync = this.tokensSupported[tokenIndex];
                        if (!(tokenToSync.chainType == "LTC" || tokenToSync.chainType == "BTC")) return [3 /*break*/, 4];
                        _b = (_a = txAdded).concat;
                        return [4 /*yield*/, syncBTCish(tokenToSync)];
                    case 3:
                        txAdded = _b.apply(_a, [_e.sent()]);
                        return [3 /*break*/, 6];
                    case 4:
                        if (!(tokenToSync.chainType == "XNO")) return [3 /*break*/, 6];
                        _d = (_c = txAdded).concat;
                        return [4 /*yield*/, syncXNO(tokenToSync)];
                    case 5:
                        txAdded = _d.apply(_c, [_e.sent()]);
                        _e.label = 6;
                    case 6:
                        tokenIndex++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, txAdded];
                }
            });
        });
    };
    __decorate([
        (0, typegoose_1.prop)({ required: false }),
        __metadata("design:type", mongoose_1["default"].Types.ObjectId)
    ], CryptoWalletWatchDogClass.prototype, "_id");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], CryptoWalletWatchDogClass.prototype, "linkedContainerID");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], CryptoWalletWatchDogClass.prototype, "defaultTransactionTypeID");
    __decorate([
        (0, typegoose_1.prop)({ required: true, type: WalletTokenClass }),
        __metadata("design:type", Array)
    ], CryptoWalletWatchDogClass.prototype, "tokensSupported");
    CryptoWalletWatchDogClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { collection: "cryptoWalletWatchdogs" }, existingConnection: financeDbMongoose })
    ], CryptoWalletWatchDogClass);
    return CryptoWalletWatchDogClass;
}());
exports.CryptoWalletWatchDogClass = CryptoWalletWatchDogClass;
exports.CryptoWalletWatchDogModel = (0, typegoose_1.getModelForClass)(CryptoWalletWatchDogClass);
var TotalValueRecordClass = /** @class */ (function () {
    function TotalValueRecordClass() {
    }
    // Add a new datum to totalValueHistory if the last record is older than 1 hour
    // return a document if a new record has been added, undefined if no document is added.
    TotalValueRecordClass.UpdateHistory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cache, allRecords, shouldAddNewRecord, lastRecord, currentTotalValue, newRecord;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, DataCache.ensure()];
                    case 1:
                        cache = _a.sent();
                        return [4 /*yield*/, exports.TotalValueRecordModel.find()];
                    case 2:
                        allRecords = _a.sent();
                        shouldAddNewRecord = false;
                        if (allRecords.length == 0)
                            shouldAddNewRecord = true;
                        else {
                            lastRecord = allRecords.sort(function (a, b) { return b.date.getTime() - a.date.getTime(); })[0];
                            if (new Date().getTime() - lastRecord.date.getTime() >= 60000 * 60)
                                shouldAddNewRecord = true;
                        }
                        if (!shouldAddNewRecord) return [3 /*break*/, 5];
                        return [4 /*yield*/, ContainerClass.getAllContainersTotalBalance(cache)];
                    case 3:
                        currentTotalValue = (_a.sent()).reduce(function (acc, val) { return acc + val.value; }, 0);
                        newRecord = (new exports.TotalValueRecordModel({ date: new Date(), value: currentTotalValue }));
                        return [4 /*yield*/, newRecord.save()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, newRecord];
                    case 5: return [2 /*return*/, undefined];
                }
            });
        });
    };
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Date)
    ], TotalValueRecordClass.prototype, "date");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Number)
    ], TotalValueRecordClass.prototype, "value");
    TotalValueRecordClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { collection: "totalValueHistory" }, existingConnection: financeDbMongoose })
    ], TotalValueRecordClass);
    return TotalValueRecordClass;
}());
exports.TotalValueRecordClass = TotalValueRecordClass;
exports.TotalValueRecordModel = (0, typegoose_1.getModelForClass)(TotalValueRecordClass);
var FinanceHistory = /** @class */ (function () {
    function FinanceHistory() {
    }
    // Add a new datum to totalValueHistory if the last record is older than 1 hour
    FinanceHistory.UpdateTotalValueDatum = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allRecords;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, financeDb.collection("totalValueHistory").find({}).toArray()];
                    case 1:
                        allRecords = _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return FinanceHistory;
}());
exports.FinanceHistory = FinanceHistory;
// #region AccountClass
var AccountClass = /** @class */ (function () {
    function AccountClass() {
    }
    // @prop({required:false, default: [], type: AccessTokenClass})
    // public accessTokens!: mongoose.Types.Array<AccessTokenClass>;
    AccountClass.register = function (username, passwordRaw) {
        return __awaiter(this, void 0, void 0, function () {
            var accountsWithSameName, pwHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!passwordRaw) return [3 /*break*/, 1];
                        throw "Password did not pass vaildation";
                    case 1:
                        if (!(username.length <= 1 || !username)) return [3 /*break*/, 2];
                        throw "Username did not pass vaildation";
                    case 2: return [4 /*yield*/, exports.AccountClassModel.find({ username: username })];
                    case 3:
                        accountsWithSameName = _a.sent();
                        if (accountsWithSameName.length > 0)
                            throw "Username taken";
                        return [4 /*yield*/, bcrypt.hash(passwordRaw, saltRounds)];
                    case 4:
                        pwHash = _a.sent();
                        return [4 /*yield*/, new exports.AccountClassModel({
                                username: username,
                                passwordHash: pwHash,
                                registerTime: new Date()
                            }).save()];
                    case 5: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AccountClass.login = function (username, passwordRaw, useragent) {
        return __awaiter(this, void 0, void 0, function () {
            var failMessage, accountsWithSameName, accountToLogin;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        failMessage = "Username or password don't match";
                        return [4 /*yield*/, exports.AccountClassModel.find({ username: username })];
                    case 1:
                        accountsWithSameName = _a.sent();
                        if (!(accountsWithSameName.length == 0)) return [3 /*break*/, 2];
                        throw failMessage;
                    case 2:
                        if (!(accountsWithSameName.length > 1)) return [3 /*break*/, 3];
                        console.log("Account with the same username detected!");
                        throw failMessage;
                    case 3:
                        accountToLogin = accountsWithSameName[0];
                        return [4 /*yield*/, bcrypt.compare(passwordRaw, accountToLogin.passwordHash)];
                    case 4:
                        if (!_a.sent()) return [3 /*break*/, 6];
                        return [4 /*yield*/, AccessTokenClass.issueToken(username, useragent)];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6: throw failMessage;
                }
            });
        });
    };
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], AccountClass.prototype, "username");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], AccountClass.prototype, "passwordHash");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Date)
    ], AccountClass.prototype, "registerTime");
    AccountClass = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { autoCreate: false, collection: "accounts" }, existingConnection: financeDbMongoose })
    ], AccountClass);
    return AccountClass;
}());
exports.AccountClass = AccountClass;
exports.AccountClassModel = (0, typegoose_1.getModelForClass)(AccountClass);
// #endregion
// #region AccessTokenClass
var AccessTokenClass = /** @class */ (function () {
    function AccessTokenClass() {
    }
    AccessTokenClass_1 = AccessTokenClass;
    AccessTokenClass.prototype.generateJWTBearer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ownerAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.AccountClassModel.findOne({ username: this.username })];
                    case 1:
                        ownerAccount = _a.sent();
                        if (ownerAccount == undefined)
                            throw "Account not found";
                        return [4 /*yield*/, jwt.sign({
                                "username": this.username,
                                "token": this.token
                            }, jwtSecret)];
                    case 2: 
                    // sign a JWT, with the username-token pair, using password hash as the secret key
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AccessTokenClass.isJWTAuthenticated = function (requestedJWTToken) {
        return __awaiter(this, void 0, void 0, function () {
            var jwtContent, isTokenValid, ex_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (requestedJWTToken.startsWith("Bearer "))
                            requestedJWTToken = requestedJWTToken.replace("Bearer ", "");
                        return [4 /*yield*/, jwt.verify(requestedJWTToken, jwtSecret)];
                    case 1:
                        jwtContent = _a.sent();
                        return [4 /*yield*/, AccessTokenClass_1.isTokenValid(jwtContent.username, jwtContent.token)];
                    case 2:
                        isTokenValid = _a.sent();
                        if (isTokenValid)
                            return [2 /*return*/, true];
                        else
                            return [2 /*return*/, false];
                        return [3 /*break*/, 4];
                    case 3:
                        ex_1 = _a.sent();
                        if (ex_1.name == "JsonWebTokenError")
                            return [2 /*return*/, false];
                        else
                            return [2 /*return*/, false];
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Return wether the request is from a logged-in user. 
    // Notice that this doesn't check if the user has access to the resources or not.
    AccessTokenClass.isRequestAuthenticated = function (expressReqObject) {
        return __awaiter(this, void 0, void 0, function () {
            var rawAuthHeader, requestedJWTToken, jwtContent, isTokenValid, ex_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        rawAuthHeader = expressReqObject.get("Authorization");
                        if (!rawAuthHeader.startsWith("Bearer ")) {
                            return [2 /*return*/, false];
                        }
                        requestedJWTToken = rawAuthHeader.split(" ")[1];
                        return [4 /*yield*/, jwt.verify(requestedJWTToken, jwtSecret)];
                    case 1:
                        jwtContent = _a.sent();
                        return [4 /*yield*/, AccessTokenClass_1.isTokenValid(jwtContent.username, jwtContent.token)];
                    case 2:
                        isTokenValid = _a.sent();
                        // {
                        //     res.status(401);
                        //     res.json({"error": "Invalid token"});
                        // }
                        if (isTokenValid)
                            return [2 /*return*/, true];
                        else
                            return [2 /*return*/, false];
                        return [3 /*break*/, 4];
                    case 3:
                        ex_2 = _a.sent();
                        if (ex_2.name == "JsonWebTokenError")
                            return [2 /*return*/, false];
                        else
                            return [2 /*return*/, false];
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Check if a given access token is valid
    // by calling this method, access token will be considered accessed.
    AccessTokenClass.isTokenValid = function (username, token) {
        return __awaiter(this, void 0, void 0, function () {
            var accessTokenClassInDB;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.AccessTokenClassModel.findOne({ token: token })];
                    case 1:
                        accessTokenClassInDB = _a.sent();
                        if (accessTokenClassInDB == undefined)
                            return [2 /*return*/, false];
                        if (accessTokenClassInDB.username != username)
                            return [2 /*return*/, false];
                        accessTokenClassInDB.lastAccessTime = new Date();
                        accessTokenClassInDB.accessCount += 1;
                        return [4 /*yield*/, accessTokenClassInDB.save()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    AccessTokenClass.issueToken = function (username, useragent) {
        return __awaiter(this, void 0, void 0, function () {
            var ownerAccount, newAccessToken, newTokenClass;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, exports.AccountClassModel.findOne({ username: username })];
                    case 1:
                        ownerAccount = _a.sent();
                        if (ownerAccount == undefined)
                            throw "Account not found";
                        newAccessToken = (0, uuid_1.v4)();
                        newTokenClass = new exports.AccessTokenClassModel({
                            token: newAccessToken,
                            useragent: useragent,
                            issueTime: new Date(),
                            lastAccessTime: new Date(),
                            userID: ownerAccount._id,
                            username: username
                        });
                        // if (ownerAccount.accessTokens == undefined) ownerAccount.accessTokens = new mongoose.Types.Array<AccessTokenClass>();
                        // ownerAccount.accessTokens.push(newTokenClass);
                        return [4 /*yield*/, newTokenClass.save()];
                    case 2:
                        // if (ownerAccount.accessTokens == undefined) ownerAccount.accessTokens = new mongoose.Types.Array<AccessTokenClass>();
                        // ownerAccount.accessTokens.push(newTokenClass);
                        _a.sent();
                        return [2 /*return*/, newTokenClass];
                }
            });
        });
    };
    var AccessTokenClass_1;
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], AccessTokenClass.prototype, "userID");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], AccessTokenClass.prototype, "username");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], AccessTokenClass.prototype, "token");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", String)
    ], AccessTokenClass.prototype, "useragent");
    __decorate([
        (0, typegoose_1.prop)({ required: true }),
        __metadata("design:type", Date)
    ], AccessTokenClass.prototype, "issueTime");
    __decorate([
        (0, typegoose_1.prop)({ required: false, "default": 0 }),
        __metadata("design:type", Number)
    ], AccessTokenClass.prototype, "accessCount");
    __decorate([
        (0, typegoose_1.prop)({ required: false }),
        __metadata("design:type", Date)
    ], AccessTokenClass.prototype, "lastAccessTime");
    AccessTokenClass = AccessTokenClass_1 = __decorate([
        (0, typegoose_1.modelOptions)({ schemaOptions: { autoCreate: true, collection: "accessTokens" }, existingConnection: financeDbMongoose })
    ], AccessTokenClass);
    return AccessTokenClass;
}());
exports.AccessTokenClass = AccessTokenClass;
exports.AccessTokenClassModel = (0, typegoose_1.getModelForClass)(AccessTokenClass);
// #endregion
// function httpGet(url:string) 
// {
//     return new Promise<any>(function (resolve, reject) 
//     {
//         var xhr = new XMLHttpRequest();
//         xhr.open("GET", url);
//         xhr.onload = function (data) 
//         {
//             if (xhr.status != 200) reject(`${xhr.status}:${xhr.statusText} ${xhr.responseText}`);
//             else resolve(data)
//         };
//         xhr.onerror = reject;
//         xhr.setRequestHeader("Content-Type", "application/json");
//         xhr.send();
//     });
// }
// Dump the whole finance database to a local file.
// dumpMongo2Localfile
//         "jsonURLPath": Types.requiredString,
//         "jmesQuery": Types.requiredString
//     // Currency
//     static currencySchema = new mongoose.Schema(
//     {
//         "name": Types.requiredString,
//         "symbol": Types.requiredString,
//         "rate": Types.requiredNumber,
//         "dataSource": { type: Finance.currencyDataSourceSchema }
//     });
//     static Currency = financeDbMongoose.model("Currency", Finance.currencySchema, "currencies");  
// export class Finance
// {
//     // Container-bound Amount
//     static containerBoundAmountSchema = new mongoose.Schema(
//     {
//         containerID: Types.requiredString,
//         amount: { type:amount, required:true }
//     }, 
//     { autoCreate: false , _id : false });
//     static containerBoundAmount = financeDbMongoose.model("ContainerBoundAmount", Finance.containerBoundAmountSchema);
//     // Transaction
//     static transactionSchema = new mongoose.Schema(
//     {
//         date: Types.requiredDate,
//         title: Types.optionalString,
//         description: Types.optionalString,
//         typeID: Types.requiredString,
//         isFromBot: Types.requiredBool,
//         from:  { type: Finance.containerBoundAmountSchema },
//         to:  { type: Finance.containerBoundAmountSchema },
//     });
//     static Transaction = financeDbMongoose.model("Transaction", Finance.transactionSchema, "transactions");  
//     // Container
//     static containerSchema = new mongoose.Schema(
//     {
//         name: Types.requiredString,
//         ownersID: [Types.requiredString]
//     });
//     static Container = financeDbMongoose.model("Container", Finance.containerSchema, "containers");  
//     // Transaction Type
//     static transactionTypeSchema = new mongoose.Schema(
//     {
//         name: Types.requiredString,
//         isEarning: Types.requiredBool,
//         isExpense: Types.requiredBool,
//     });
//     static TransactionType = financeDbMongoose.model("TransactionType", Finance.transactionTypeSchema, "transactionTypes");  
//     // Currency Data Source
//     static currencyDataSourceSchema = new mongoose.Schema(
//     {
//         "jsonURLHost": Types.requiredString,
//         "jsonURLPath": Types.requiredString,
//         "jmesQuery": Types.requiredString
//     },{ autoCreate: false });
//     static CurrencyDataSource = financeDbMongoose.model("CurrencyDataSource", Finance.currencyDataSourceSchema);  
//     // Currency
//     static currencySchema = new mongoose.Schema(
//     {
//         "name": Types.requiredString,
//         "symbol": Types.requiredString,
//         "rate": Types.requiredNumber,
//         "dataSource": { type: Finance.currencyDataSourceSchema }
//     });
//     static Currency = financeDbMongoose.model("Currency", Finance.currencySchema, "currencies");  
//     // CryptoWalletWatchdog
//     static CryptoWalletWatchdogSchema = new mongoose.Schema(
//     {
//         linkedContainerID: 
//         {
//             ...Types.requiredString,
//             validate: 
//             {
//                 validator: isContainerIdExist,
//                 message: 'Container with ID={VALUE} doesn\'t exist.'
//             }
//         },
//         defaultTransactionTypeID: 
//         {
//             ...Types.requiredString,
//             validate: 
//             {
//                 validator: isTransactionTypeExist,
//                 message: 'TransactionType with ID={VALUE} doesn\'t exist.'
//             }
//         },
//         tokensSupported: 
//         [
//             {
//                 publicAddress: Types.requiredString,
//                 chainType: Types.requiredString,
//                 currencyID: 
//                 {
//                     ...Types.requiredString,
//                     validate: 
//                     {
//                         validator: isCurrencyIdExist,
//                         message: 'Currency with ID={VALUE} doesn\'t exist.'
//                     }
//                 }
//             }
//         ]
//     });
//     static CryptoWalletWatchdog = financeDbMongoose.model("CryptoWalletWatchdog", Finance.CryptoWalletWatchdogSchema, "cryptoWalletWatchdogs");  
// };
// async function isCurrencyIdExist(id:string) { return (await financeDbMongoose.model("Currency").find({_id:id})).length > 0; }
// async function isContainerIdExist(id:string) { return (await financeDbMongoose.model("Container").find({_id:id})).length > 0; }
// async function isTransactionTypeExist(id:string) { return (await financeDbMongoose.model("TransactionType").find({_id:id})).length > 0; }
// // mongoClient.db("finance").collection("transactions").find().toArray().then(log);
// // financeDb.collection("transactions").find().toArray(function (err,result)
// // {
// //     log(2);
// // });
// // financeDb.collection("transactions").find().toArray((err, result) => 
// // {
// //     if (err) logRed(err);
// //     else log(result);
// // });
// // if (mongoClient.db('finance').getMongo().getDBNames().indexOf("finance") == -1)
// // {
// //     logRed(`Database "finance" doesn't exist.`);
// // }
//(new AmountModel({currencyID:"63b5fe6c13e0eeed4d8d1fad", value:1})).getValue().then(log);
//financeDbMongoose.model("Container").find;
(function () {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
})();
//ContainerClass.getTotalBalance(`63b5fbad98550215af18cd34`).then(log);
