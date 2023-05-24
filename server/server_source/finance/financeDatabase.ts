import { prop, getModelForClass, modelOptions, ReturnModelType } from "@typegoose/typegoose"
import * as typegoose from "@typegoose/typegoose";
import * as mongo from "mongodb";
import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from 'uuid';
import mongoose, { Model, Mongoose, ObjectId, PromiseProvider } from "mongoose";
import { Types } from "../database";
import { logGreen, logRed, log, logBlue, getLog, logYellow } from "../extendedLog";
import axios from "axios";
import { genUUID } from "../uuid";

const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET;

let jwt = require("jsonwebtoken");
let databaseToUse = "finance";
let mongoWrapper = require("../database");
let mongoClient:MongoClient = mongoWrapper.client;
let financeDb:mongo.Db = mongoClient.db(databaseToUse);
let financeDbMongoose: mongoose.Connection = mongoWrapper.mongooseClient.useDb(databaseToUse);
let txCollection:mongo.Collection = financeDb.collection("transactions");

// The type of a given transaction, "Receive" means the amount is added to the wallet. "Spent" means the amount is transferred out (spent).
export type TransactionMovementType = "Receive" | "Spent";

exports.mongoWrapper = mongoWrapper;
exports.mongoClient = mongoClient;
exports.financeDb = financeDb;
exports.financeDbMongoose = financeDbMongoose;
exports.txCollection = txCollection;

export class DataCache
{
    public allTransactions?: Array<TransactionClass>;
    public allCurrencies?: Array<CurrencyClass>;
    public allContainers?: Array<ContainerClass>;
    public allTransactionTypes?: Array<TransactionTypeClass>;

    // Ensure that all properties in this class are fetched from the database.
    static async ensure(cache?: DataCache): Promise<DataCache>
    {
        if (cache == undefined) cache = new DataCache();
        if (cache.allContainers == undefined) cache.allContainers = await ContainerModel.find(); // fetch all containers from db
        if (cache.allCurrencies == undefined) cache.allCurrencies = await CurrencyModel.find(); // fetch all currencies from db
        if (cache.allTransactions == undefined) cache.allTransactions = await TransactionModel.find(); // fetch all transactions from db
        if (cache.allTransactionTypes == undefined) cache.allTransactionTypes = await TransactionTypeModel.find(); // fetch all types from db
        return cache;
    }
}

@modelOptions ( { schemaOptions: { autoCreate: false , _id : false }, existingConnection:financeDbMongoose } )
export class AmountClass
{
    @prop({required:true})
    public currencyID!: string;

    @prop({required:true})
    public value!: number;

    // If you wish not to fetch currencies from db again, provide a list of all currencies.
    public async getValue(allCurrencies?:CurrencyClass[])
    {
        let respectiveCurrency:CurrencyClass|undefined|null;
        if (allCurrencies == undefined) respectiveCurrency = await CurrencyModel.findOne({pubID: this.currencyID});
        else respectiveCurrency = allCurrencies!.find(c => c.pubID?.toString() == this.currencyID);

        if (respectiveCurrency) return respectiveCurrency!.rate * this.value;
        else throw new Error(`Currency with ID=${this.currencyID} is not found.`);
    }
}
export const AmountModel = getModelForClass(AmountClass);

@modelOptions ( { schemaOptions: { autoCreate: false , _id : false }, existingConnection:financeDbMongoose } )
export class ContainerBoundAmountClass
{
    @prop({required:true})
    public containerID!: string;
    
    @prop({required:true})
    public amount!: AmountClass;
}
export const ContainerBoundAmountModel = getModelForClass(ContainerBoundAmountClass);

@modelOptions ( {schemaOptions: { collection: "transactions" }, existingConnection: financeDbMongoose} )
export class TransactionClass
{
    @prop( { required: true } )
    pubID: string;

    @prop( { required: true } )
    date!: Date;

    @prop( { required: true } )
    title!: string;

    @prop( { required: false } )
    description?: string;

    @prop( { required: true } )
    typeID!: string;

    @prop( { required: true } )
    isFromBot!: boolean;
    
    @prop( { required: false} )
    from?: ContainerBoundAmountClass;
    
    @prop( { required: false } )
    to?: ContainerBoundAmountClass;

    // If you wish not to fetch currencies from db again, provide a list of all currencies.
    public async getChangeInValue(allCurrencies?:CurrencyClass[])
    {
        if (this.from == undefined && this.to != undefined) return await this.to.amount.getValue(allCurrencies);
        else if (this.from != undefined && this.to != undefined) return await this.to.amount.getValue(allCurrencies) - await this.from.amount.getValue(allCurrencies);
        else if (this.from != undefined && this.to == undefined) return await this.from.amount.getValue(allCurrencies) * -1;
        return 0;
    }
}
export const TransactionModel = getModelForClass(TransactionClass);

@modelOptions ( {schemaOptions: { collection: "containers" }, existingConnection: financeDbMongoose } )
export class ContainerClass
{
    @prop( { type:String, required: true } )
    pubID: string;

    @prop( { type:String, required: true} )
    name: string;

    @prop( { type:String, required: true, default: [] } )
    ownersID: mongoose.Types.Array<string>;

    // cached results can be provided to speed up the function.
    public async getTotalBalance(cache?:DataCache|undefined)
    {
        if (this["_id"] == undefined) throw new Error(`This container doesn't exist in the database. Save it before calling this function.`)
        cache = await DataCache.ensure(cache);

        // Expected output
        // { value:2.1, balance: { "63b5fe6c13e0eeed4d8d1fad": 2.1, ... }, _id: '63b5fbad98550215af18cd31' }
        var output = {pubID: this.pubID, balance:{}, value:0};

        cache.allTransactions!.forEach(tx => 
        {
            // Add balance if defined.
            if (tx.to != undefined && tx.to != null)
            {
                // Check if the transaction relates to the current container:
                if (tx.to.containerID == this.pubID.toString())
                {
                    var cID = tx.to.amount.currencyID;
                    let respectiveCurrency:CurrencyClass|undefined = cache!.allCurrencies!.find(x => x.pubID.toString() == cID);

                    if (cID in output.balance) output.balance[cID] += tx.to.amount.value;
                    else output.balance[cID] = tx.to.amount.value;

                    // Calculate value change
                    if (respectiveCurrency != undefined) output.value += respectiveCurrency.rate * tx.to!.amount.value;
                }
            }

            // Subtract balance if defined.
            if (tx.from != undefined && tx.from != null)
            {
                // Check if the transaction relates to the current container:
                if (tx.from.containerID == this.pubID.toString())
                {
                    var cID = tx.from.amount.currencyID;
                    let respectiveCurrency:CurrencyClass|undefined = cache!.allCurrencies!.find(x => x.pubID.toString() == cID);

                    var cID = tx.from.amount.currencyID;
                    if (cID in output.balance) output.balance[cID] -= tx.from.amount.value;
                    else output.balance[cID] = tx.from.amount.value * -1;

                    // Calculate value change
                    if (respectiveCurrency != undefined) output.value -= respectiveCurrency.rate * tx.from!.amount.value;
                }
            }
        });

        return output;
    }

    // cached results can be provided to speed up the function.
    public static async getAllContainersTotalBalance(cache?:DataCache|undefined)
    {
        // find all containers, currencies and transactions
        if (cache == undefined) cache = new DataCache();
        await DataCache.ensure(cache);

        var output:any = [];
        for (var i = 0; i < cache.allContainers!.length; i++)
        {
            output.push(
            {
                ...await cache.allContainers![i].getTotalBalance(cache),
                "name": cache.allContainers![i].name,
                "ownersID": cache.allContainers![i].ownersID
            });
        }
        return output;
    }
}
export const ContainerModel = getModelForClass(ContainerClass);

@modelOptions ( { schemaOptions: {  collection: "transactionTypes" } , existingConnection: financeDbMongoose} )
export class TransactionTypeClass
{
    @prop( { required: true } )
    pubID: string;
    @prop( { required: true } )
    name!: string;
    @prop( { required: true } )
    isEarning!: boolean;
    @prop( { required: true } )
    isExpense!: boolean;
}
export const TransactionTypeModel = getModelForClass(TransactionTypeClass);

@modelOptions ( { schemaOptions: { autoCreate:false, _id : false } , existingConnection: financeDbMongoose} )
export class CurrencyDataSourceClass
{
    @prop( { required: true } )
    jsonURLHost!: string;
    @prop( { required: true } )
    jsonURLPath!: string;
    @prop( { required: true } )
    jmesQuery!: string;
}
export const CurrencyDataSourceModel = getModelForClass(CurrencyDataSourceClass);

@modelOptions ( {schemaOptions: { collection: "currencies" }, existingConnection: financeDbMongoose} )
export class CurrencyClass
{
    @prop( { required: true } )
    pubID: string
    @prop( { required: true } )
    name!: string;
    @prop( { required: true } )
    symbol!: string;
    @prop( { required: true } )
    rate!: number;
    @prop( { required: false } )
    dataSource!: CurrencyDataSourceClass;
}
export const CurrencyModel = getModelForClass(CurrencyClass);

@modelOptions ( { schemaOptions: { autoCreate:false, _id : false } , existingConnection: financeDbMongoose} )
export class WalletTokenClass
{
    @prop( { required: true } )
    publicAddress!: string

    @prop( { required: true, enum:["BTC","LTC", "XNO"] } )
    chainType!: string

    @prop( { required: true } )
    currencyID!: string
}
export const WalletTokenModel = getModelForClass(WalletTokenClass);

@modelOptions ( {schemaOptions: { collection: "cryptoWalletWatchdogs" }, existingConnection: financeDbMongoose} )
export class CryptoWalletWatchDogClass
{
    @prop( { required: true } )
    pubID: string;

    @prop( {required: true} )
    linkedContainerID!: string;
    
    @prop( {required: true} )
    defaultTransactionTypeID!: string;

    @prop( { required: true, type: WalletTokenClass } )
    tokensSupported!: WalletTokenClass[];

    // returns a list of newly added tx.
    async synchronizeAllTokens(cache?:DataCache):Promise<Array<TransactionClass>>
    {
        cache = await DataCache.ensure(cache);
        var self:CryptoWalletWatchDogClass = this;

        // Check for a transaction already added.
        // If it's not added already, append and save them to the database, and return the TransactionClass created.
        // Will return undefined if no transaction was added.
        async function tryAppendTxn(dateOfTransaction:Date, nativeAmount:number, txType: TransactionMovementType, token: WalletTokenClass) : Promise<void | TransactionClass>
        {
            let txAmountString:string = nativeAmount.toFixed(9);
            let keyToMatch:string = txType == "Receive" ? "to" : "from";

            // check if the transaction is found in the record
            var recordFound = cache!.allTransactions!.some(savedTransaction => 
            {
                var isDateMatch = new Date(savedTransaction.date).toISOString() == dateOfTransaction.toISOString();
                if (!isDateMatch) return false;
                if (savedTransaction[keyToMatch] == undefined) return false;
                if (savedTransaction[keyToMatch].amount.value != Number.parseFloat(txAmountString)) return false;
                if (savedTransaction[keyToMatch].containerID != self.linkedContainerID) return false;
                return true;
            });
            
            // if record NOT found, add them
            if (!recordFound)
            {   
                log(`CryptoWalletWatchDog: Added Tx from ${dateOfTransaction.toISOString()} of ${token.publicAddress}`);

                let transactionBodyToAdd:any = 
                {
                    "title": `${token.chainType} Transaction`,
                    "typeID": self.defaultTransactionTypeID,
                    "date": dateOfTransaction.toISOString(),
                    "isFromBot": true,
                    "pubID": genUUID()
                };

                transactionBodyToAdd[keyToMatch] = 
                {
                    containerID: self.linkedContainerID,
                    amount: 
                    {
                        currencyID: token.currencyID,
                        value: Number.parseFloat(txAmountString)
                    }
                }

                var newlyAddedTx = (await new TransactionModel(transactionBodyToAdd).save());
                return newlyAddedTx;
            }

            return undefined;
        }

        // returns a list of newly added tx.
        async function syncBTCish(token: WalletTokenClass) : Promise<Array<TransactionClass>>
        {
            if (token.chainType == "LTC" || token.chainType == "BTC")
            {
                let addedTxns: any[] = []; // this will be the return value

                var fetchResponse = await axios.get(`https://api.blockcypher.com/v1/${token.chainType.toLowerCase()}/main/addrs/${token.publicAddress}`);
                if (fetchResponse.status != 200) 
                {
                    logRed(`Error fetching blockchain data for watchdog id=${self.pubID}: E${response.status}: ${response.body}`);
                    return [];
                }

                var response = await fetchResponse.data;
                if (response.txrefs == undefined) return [];

                // get all transactions of the fetched wallet
                for (var txIndex = 0; txIndex < response.txrefs.length; txIndex++)
                {
                    var txref = response.txrefs[txIndex];
                    if (txref.confirmations >= 10 && txref.confirmed != undefined)
                    {
                        var addedTx = await tryAppendTxn
                        (
                            new Date(txref.confirmed), 
                            txref.value * 0.00000001, 
                            txref.spent == undefined ? "Spent" : "Receive", 
                            token
                        );

                        if (addedTx != undefined) addedTxns.push(addedTx);
                    }
                }

                return addedTxns;
            }
            else throw new Error(`The given token is not on the BTC or LTC chain.`);
        }

        // returns a list of newly added tx.
        async function syncXNO(token: WalletTokenClass) : Promise<Array<TransactionClass>>
        {
            try
            {
                if (token.chainType == "XNO") 
                {
                    let addedTxns: any[] = []; // this will be the return value

                    var fetchResponse = await axios.post(`https://www.nanolooker.com/api/rpc`, 
                    {
                        "action": "account_history",
                        "account": token.publicAddress,
                        "count":"9999"
                    });

                    if (fetchResponse.status != 200) 
                    {
                        logRed(`Error fetching blockchain data for watchdog id=${self.pubID}: E${response.status}: ${response.body}`);
                        return [];
                    }

                    var response = await fetchResponse.data;

                    if (response.error == "Bad account number") 
                    {
                        logRed(`Error fetching blockchain data for watchdog id=${self.pubID}: of chain XNO: The given public address ${token.publicAddress} cannot be found.`);
                        return [];
                    }
                    else if (response.error != undefined) 
                    {
                        logRed(`Error fetching blockchain data for watchdog id=${self.pubID}: of chain XNO: ${response.error}`);
                        return [];
                    }
                    else
                    {
                        var allTransactions = response.history;
                        for (var i = 0; i < allTransactions.length; i++)
                        {
                            var item = allTransactions[i];
                            if (item["confirmed"] == "true")
                            {
                                var addedTx = await tryAppendTxn
                                (
                                    new Date(Number.parseInt(item["local_timestamp"]) * 1000),
                                    Number.parseInt(item["amount"]) / 10e+29,
                                    item["type"] == "receive" ? "Receive" : "Spent",
                                    token
                                );

                                if (addedTx != undefined) addedTxns.push(addedTx);
                            }
                        }
                    }

                    return addedTxns;
                }
                else throw new Error(`The given token is not on the XNO chain.`);
            }
            catch(ex)
            {
                console.log(`Error trying to update address info of ${token.publicAddress} in chain ${token.chainType}`);
            }
        }

        let txAdded:Array<TransactionClass> = [];
        for (let tokenIndex = 0; tokenIndex < this.tokensSupported.length; tokenIndex++)
        {
            var tokenToSync = this.tokensSupported[tokenIndex];
            if (tokenToSync.chainType == "LTC" || tokenToSync.chainType == "BTC") txAdded = txAdded.concat(await syncBTCish(tokenToSync));
            else if (tokenToSync.chainType == "XNO") txAdded = txAdded.concat(await syncXNO(tokenToSync));
        }
        return txAdded;
    }
}
export const CryptoWalletWatchDogModel = getModelForClass(CryptoWalletWatchDogClass);

@modelOptions ( {schemaOptions: { collection: "totalValueHistory" }, existingConnection: financeDbMongoose} )
export class TotalValueRecordClass
{
    @prop( {required: true} )
    date: Date;

    @prop( {required:true } )
    value: number;

    // Add a new datum to totalValueHistory if the last record is older than 1 hour
    // return a document if a new record has been added, undefined if no document is added.
    static async UpdateHistory()
    {
        var cache = await DataCache.ensure();
        var allRecords = await TotalValueRecordModel.find();
        var shouldAddNewRecord = false;
        if (allRecords.length == 0) shouldAddNewRecord = true;
        else
        {
            var lastRecord = allRecords.sort((a,b) => { return b.date.getTime() - a.date.getTime() })[0];
            if (new Date().getTime() - lastRecord.date.getTime() >= 60000 * 60) shouldAddNewRecord = true;
        }
        if (shouldAddNewRecord)
        {
            var currentTotalValue = (await ContainerClass.getAllContainersTotalBalance(cache)).reduce((acc, val) => { return acc + val.value }, 0);
            var newRecord = (new TotalValueRecordModel({date: new Date(), value: currentTotalValue}));
            await newRecord.save();
            return newRecord;
        }
        else return undefined;
    }
}
export const TotalValueRecordModel = getModelForClass(TotalValueRecordClass);

export class FinanceHistory
{
    // Add a new datum to totalValueHistory if the last record is older than 1 hour
    static async UpdateTotalValueDatum()
    {
        // each 
        var allRecords = await financeDb.collection("totalValueHistory").find({}).toArray();

    }
}

// #region AccountClass
@modelOptions ( { schemaOptions: { autoCreate: false, collection: "accounts" }, existingConnection:financeDbMongoose } )
export class AccountClass
{
    @prop({required:true})
    public username!: string;

    @prop({required:true})
    public passwordHash!: string;

    @prop({required:true})
    public registerTime!: Date;

    // @prop({required:false, default: [], type: AccessTokenClass})
    // public accessTokens!: mongoose.Types.Array<AccessTokenClass>;

    public static async register(username:string, passwordRaw: string) : Promise<AccountClass>
    {
        if (!passwordRaw) throw "Password did not pass vaildation";
        else if (username.length <= 1 || !username) throw "Username did not pass vaildation";
        else
        {
            // check if name already taken
            let accountsWithSameName = await AccountClassModel.find({username: username});
            if (accountsWithSameName.length > 0) throw "Username taken";

            let pwHash = await bcrypt.hash(passwordRaw, saltRounds);
            return await new AccountClassModel(
            {
                username: username,
                passwordHash: pwHash,
                registerTime: new Date()
            }).save();
        } 
    }

    public static async login(username:string, passwordRaw:string, useragent:string) : Promise<AccessTokenClass>
    {
        const failMessage = "Username or password don't match";
        let accountsWithSameName = await AccountClassModel.find({username:username});
        if (accountsWithSameName.length == 0) throw failMessage;
        else if (accountsWithSameName.length > 1) { console.log("Account with the same username detected!"); throw failMessage; }
        else
        {
            let accountToLogin = accountsWithSameName[0];
            if (await bcrypt.compare(passwordRaw, accountToLogin.passwordHash)) return await AccessTokenClass.issueToken(username, useragent);
            else throw failMessage;
        }
    }

}
export const AccountClassModel = getModelForClass(AccountClass);
// #endregion

// #region AccessTokenClass
@modelOptions ( { schemaOptions: { autoCreate: true, collection:"accessTokens" }, existingConnection:financeDbMongoose } )
export class AccessTokenClass
{
    @prop( {required:true} )
    public userID!: string;

    @prop( {required:true} )
    public username!: string;

    @prop( {required:true} )
    public token!: string;
    
    @prop( {required:true} )
    public useragent!: string;

    @prop( {required:true} )
    public issueTime!: Date;

    @prop( {required:false, default: 0} )
    public accessCount!: number;

    @prop( {required:false} )
    public lastAccessTime!: Date;

    public async generateJWTBearer() : Promise<string>
    {
        let ownerAccount = await AccountClassModel.findOne({username: this.username});
        if (ownerAccount == undefined) throw "Account not found";

        // sign a JWT, with the username-token pair, using password hash as the secret key
        return await jwt.sign(
        {
            "username": this.username,
            "token": this.token
        }, jwtSecret);
    }

    public static async isJWTAuthenticated(requestedJWTToken:string) : Promise<boolean>
    {
        try
        {
            if (requestedJWTToken.startsWith("Bearer ")) requestedJWTToken = requestedJWTToken.replace("Bearer ", "");
            let jwtContent = await jwt.verify(requestedJWTToken, jwtSecret);
            let isTokenValid = await AccessTokenClass.isTokenValid(jwtContent.username, jwtContent.token);
            if (isTokenValid) return true;
            else return false;
        }
        catch(ex) 
        { 
            if (ex.name == "JsonWebTokenError") return false;
            else return false; 
        }
    }

    // Return wether the request is from a logged-in user. 
    // Notice that this doesn't check if the user has access to the resources or not.
    public static async isRequestAuthenticated(expressReqObject:any) : Promise<boolean>
    {
        try
        {
            let rawAuthHeader: string = expressReqObject.get("Authorization");
            if (!rawAuthHeader.startsWith("Bearer ")) { return false; }
            let requestedJWTToken = rawAuthHeader.split(" ")[1];
            let jwtContent = await jwt.verify(requestedJWTToken, jwtSecret);
            let isTokenValid = await AccessTokenClass.isTokenValid(jwtContent.username, jwtContent.token);
             
            // {
            //     res.status(401);
            //     res.json({"error": "Invalid token"});
            // }
            if (isTokenValid) return true;
            else return false;
        }
        catch(ex) 
        { 
            if (ex.name == "JsonWebTokenError") return false;
            else return false; 
        }
    }

    // Check if a given access token is valid
    // by calling this method, access token will be considered accessed.
    public static async isTokenValid(username:string, token:string) : Promise<boolean>
    {
        let accessTokenClassInDB = await AccessTokenClassModel.findOne({ token: token });
        if (accessTokenClassInDB == undefined) return false;
        if (accessTokenClassInDB.username != username) return false;
        accessTokenClassInDB.lastAccessTime = new Date();
        accessTokenClassInDB.accessCount += 1;
        await accessTokenClassInDB.save();
        return true;
    }

    public static async issueToken(username: string, useragent: string): Promise<AccessTokenClass>
    {
        let ownerAccount = await AccountClassModel.findOne({username: username});
        if (ownerAccount == undefined) throw "Account not found";

        let newAccessToken = uuidv4();
        let newTokenClass = new AccessTokenClassModel(
        {
            token: newAccessToken, 
            useragent: useragent,
            issueTime: new Date(),
            lastAccessTime: new Date(),
            userID: ownerAccount._id,
            username: username
        });

        // if (ownerAccount.accessTokens == undefined) ownerAccount.accessTokens = new mongoose.Types.Array<AccessTokenClass>();
        // ownerAccount.accessTokens.push(newTokenClass);
        await newTokenClass.save();

        return newTokenClass;
    }
}
export const AccessTokenClassModel = getModelForClass(AccessTokenClass);

// (async () =>
// {
//     (await TransactionModel.find()).forEach(async x => 
//     {
//         if (x.isFromBot)
//         {
//             await x.delete();
//         }
//     });
// })();



// (async () => 
// {
//     var allContainers = await ContainerModel.find();
//     var allCurrencies = await CurrencyModel.find();
//     var allTypes = await TransactionTypeModel.find();
//     var containersMap = {};
//     var currenciesMap = {};
//     var typesMap = {};
//     allContainers.forEach(container => { containersMap[container.id] = container.pubID; });
//     allCurrencies.forEach(currency => { currenciesMap[currency.id] = currency.pubID; });
//     allTypes.forEach(type => { typesMap[type.id] = type.pubID; });

//     setTimeout(async () => 
//     {
//         (await CryptoWalletWatchDogModel.find()).forEach(async x => 
//         {
//             if (x.linkedContainerID.length > 30) return;

//             var oldContainerID = x.linkedContainerID;
//             x.linkedContainerID = containersMap[oldContainerID];

//             var oldTypeID = x.defaultTransactionTypeID;
//             x.defaultTransactionTypeID = typesMap[oldTypeID];

//             x.tokensSupported.forEach(token => 
//             {
//                 var oldID = token.currencyID;
//                 token.currencyID = currenciesMap[oldID];
//             });

//             setTimeout(async () => { await x.save(); }, 1000);
//         });
//     }, 1000);
// })();

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
(async function () 
{
    //ContainerClass.getAllContainersTotalBalance().then(log)
})();
//ContainerClass.getTotalBalance(`63b5fbad98550215af18cd34`).then(log);