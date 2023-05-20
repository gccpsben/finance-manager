"use strict";
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
exports.Types = exports.Validators = exports.init = exports.mongooseClient = exports.databaseURL = exports.client = void 0;
var extendedLog_1 = require("./extendedLog");
var mongo = require("mongodb");
var mongoose = require("mongoose");
function init(url) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    exports.databaseURL = url;
                    (0, extendedLog_1.logYellow)("Connecting to finance database...");
                    exports.client = new mongo.MongoClient(url);
                    return [4 /*yield*/, this.client.db("admin").command({ ping: 1 })];
                case 1:
                    _b.sent();
                    _a = exports;
                    return [4 /*yield*/, mongoose.createConnection(url).asPromise()];
                case 2:
                    _a.mongooseClient = _b.sent();
                    (0, extendedLog_1.logGreen)("Connected to finance database and set up mongoose.");
                    return [2 /*return*/, this.client];
                case 3:
                    e_1 = _b.sent();
                    (0, extendedLog_1.logRed)("Unable to connect to finance database...");
                    (0, extendedLog_1.log)(e_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.init = init;
var Validators = /** @class */ (function () {
    function Validators() {
    }
    Validators.intValidator = {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value.'
    };
    return Validators;
}());
exports.Validators = Validators;
var Types = /** @class */ (function () {
    function Types() {
    }
    Types.requiredNumber = { type: Number, required: true };
    Types.requiredString = { type: String, required: true };
    Types.requiredDate = { type: Date, required: true };
    Types.requiredBool = { type: Boolean, required: true };
    Types.optionalNumber = { type: Number, required: false };
    Types.optionalString = { type: String, required: false };
    Types.optionalDate = { type: Date, required: false };
    Types.optionalBool = { type: Boolean, required: false };
    Types.requiredInt = {
        type: Number,
        required: true,
        validate: Validators.intValidator
    };
    return Types;
}());
exports.Types = Types;
