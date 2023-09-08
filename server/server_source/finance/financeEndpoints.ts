
import { logGreen, logRed, log, logBlue, getLog, logYellow } from "../extendedLog";
import { Express, Request, Response } from "express";
import mongoose, { Model, Mongoose } from "mongoose";
import { genUUID } from "../uuid";
import { AccessTokenClassModel } from "../accessToken";
import { CurrencyModel } from "./currency";
import { TransactionClass, TransactionModel, TransactionTypeModel } from "./transaction";
import { TotalValueRecordClass, TotalValueRecordModel } from "./totalValueRecord";
import { AccountClass, AccountClassModel } from "../account";
import { CryptoWalletWatchDogClass, CryptoWalletWatchDogModel } from "./cryptoWalletWatchDog";
import { DataCache } from "./dataCache";
import { ContainerClass, ContainerModel } from "./container";

var jmespath = require('jmespath');
let expressInstance:Express = undefined;
const shortcuts = require("../supexShortcuts");

export function initialize (express_instance:Express)
{
    try 
    {
        expressInstance = express_instance;

        expressInstance.get(`/api/finance/containers`, async (req:any ,res:any) => 
        { 
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            res.json(await ContainerClass.getAllContainersTotalBalance()); 
        });

        expressInstance.get(`/api/finance/transactions`, async (req, res) => 
        { 
            try
            {
                // Check for permission and login
                if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

                let startingIndex = 0;
                let endingIndex:number = undefined;

                if (req.query.start) startingIndex = parseInt(req.query?.start.toString());
                if (req.query.end) endingIndex = parseInt(req.query?.end.toString());
                if (req.query.start !== undefined && req.query.end !== undefined)
                {
                    if (startingIndex > endingIndex) throw new Error(`Starting index must not be smaller than ending index.`);
                }

                let onlyUnresolved = req.query.onlyunresolved == "true";
                let currencies = await CurrencyModel.find();
                
                let allTxs = [];
                if (startingIndex !== undefined && endingIndex !== undefined)
                {
                    allTxs = await TransactionModel.find().limit(endingIndex - startingIndex + 1).sort({"date":-1}).skip(startingIndex);
                }
                else { allTxs = await TransactionModel.find().sort({"date":-1}); }

                TransactionModel.find

                var output:any = [];
                for (let index = 0; index < allTxs.length; index++) 
                {
                    let tx = allTxs[index];

                    if (onlyUnresolved && !tx.isTypePending) continue;
                    if (onlyUnresolved && (tx.isTypePending && tx.isResolved)) continue;

                    output.push(
                    {
                        ...tx.toJSON(),
                        "changeInValue": await tx.getChangeInValue(currencies)
                    });
                }

                res.json(output); 
            }
            catch(error) { log(error); res.status(400).send({message: error}); }
        });

        expressInstance.post(`/api/finance/transactions/resolve`, async (req:any, res:any) => 
        { 
            try
            {
                // Check for permission and login
                if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

                let allTxs = (await TransactionModel.find());
                let allUnresolvedTxns = allTxs.filter(x => !x.isResolved);
                let idToResolve = req.body.resolveID as string;
                let targetToResolve = allUnresolvedTxns.filter(x => x.pubID == idToResolve)[0];
                if (targetToResolve == undefined) throw new Error(`The given pubID is not found, or is already resolved.`);
                targetToResolve.resolution = { date: new Date() };
                await targetToResolve.save();
                res.json(targetToResolve);
            }
            catch(error) { log(error); res.status(400).send({message: error}); }
        });

        expressInstance.get(`/api/finance/currencies`, async (req:any, res:any) => 
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }
            
            res.json(await CurrencyModel.find()); 
        });
        expressInstance.get(`/api/finance/transactionTypes`, async (req:any, res:any) => 
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            res.json(await TransactionTypeModel.find()); 
        });

        expressInstance.post(`/api/finance/types/add`, async (req:any, res:any) => 
        {
            try
            {
                // Check for permission and login
                if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

                let newID = genUUID();
                let type = new TransactionTypeModel(
                {
                    pubID: newID,
                    ...req.body,
                    isEarning: true,
                    isExpense: true
                });

                res.json(await type.save()); 
            }
            catch(error) { log(error); res.status(400).send({message: error}); }
        });

        expressInstance.post(`/api/finance/currencies/add`, async (req:any, res:any) => 
        {
            try
            {
                // Check for permission and login
                if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

                let newID = genUUID();
                let currency = new CurrencyModel(
                {
                    ...req.body,
                    "pubID": newID
                });

                res.json(await currency.save()); 
            }
            catch(error) { log(error); res.status(400).send({message: error}); }
        });

        expressInstance.get(`/api/finance/graphs`, async (req: Request, res:Response) => 
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            res.status(200).json(await ContainerClass.getExpensesAndIncomes());
        });
        
        expressInstance.get(`/api/finance/summary`, async (req:any, res:any) => 
        { 
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            let allTxns = (await TransactionModel.find());
            let allCurrencies = await CurrencyModel.find();
            var oneWeekAgoDate = new Date();  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7);
            var oneMonthAgoDate = new Date(); oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);

            // Calculate all the changeInValue of transactions.
            // An extra properties will be added to the hydrated txns: changeInValue
            let hydratedTxns:any = [];
            for (let index in allTxns)
            {
                hydratedTxns.push(
                {
                    ...(allTxns[index].toJSON()),
                    "changeInValue": await (allTxns[index].getChangeInValue(allCurrencies))
                });
            }

            // a list of txns with changeInValue > 0
            // type is lost since an extra property "changeInValue" is added.
            let allIncomeTxns:any = hydratedTxns.filter(tx => tx.changeInValue > 0); 
            let allExpenseTxns:any = hydratedTxns.filter(tx => tx.changeInValue < 0);        

            // The income/expense of last 30d will be sorted from oldest to newest.
            let incomeTxns30d:any = allIncomeTxns.filter(tx => tx.date > oneMonthAgoDate).sort((b,a) => b.date - a.date); 
            let expenseTxns30d:any = allExpenseTxns.filter(tx => tx.date > oneMonthAgoDate).sort((b,a) => b.date - a.date); 
            let incomeTxns7d:any = allIncomeTxns.filter(tx => tx.date > oneWeekAgoDate).sort((b,a) => b.date - a.date); 
            let expenseTxns7d:any = allExpenseTxns.filter(tx => tx.date > oneWeekAgoDate).sort((b,a) => b.date - a.date); 

            var output = 
            {
                "totalIncomes30d": incomeTxns30d.reduce((acc:any, val:any) => acc + val.changeInValue, 0),
                "totalExpenses30d": expenseTxns30d.reduce((acc:any, val:any) => acc - val.changeInValue, 0),
                "totalIncomes7d": incomeTxns7d.reduce((acc:any, val:any) => acc + val.changeInValue, 0),
                "totalExpenses7d": expenseTxns7d.reduce((acc:any, val:any) => acc - val.changeInValue, 0),
                "totalIncomes": allIncomeTxns.reduce((acc:any, val:any) => acc + val.changeInValue, 0),
                "totalExpenses": allExpenseTxns.reduce((acc:any, val:any) => acc - val.changeInValue, 0),
                "incomes30d": incomeTxns30d,
                "expenses30d": expenseTxns30d,
                "allPendingTransactions": hydratedTxns.filter(x => x.isTypePending && x.resolution == undefined),
                "totalTransactionsCount": await TransactionModel.count()
            };
            output['totalValue'] = output.totalIncomes - output.totalExpenses;
            
            res.json(output);
        });

        expressInstance.post(`/api/finance/transactions/add`, async (req:any,res:any) =>
        {
            try 
            {
                // Check for permission and login
                if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

                var newTxnID = genUUID();
                var txn = new TransactionModel(
                {
                    ...req.body, 
                    "pubID": newTxnID,
                    "isFromBot": false
                }); 

                var fromContainerID = req.body?.from?.containerID ?? undefined;
                var toContainerID = req.body?.to?.containerID ?? undefined;
                var typeID = req.body?.typeID ?? undefined;
                var fromContainerPass = req.body?.from ? await ContainerModel.isExist(fromContainerID) : true;
                var toContainerPass = req.body?.to ? await ContainerModel.isExist(toContainerID) : true;
                var typeExists = req.body?.typeID && await TransactionTypeModel.isExist(typeID);

                // if (req.body.date != undefined) txn.date = new Date(req.body.date);

                // Check if containers exist
                if (!fromContainerPass || !toContainerPass) throw new Error(`Container pubID=${fromContainerID || toContainerID} doesn't exist.`);

                // Check if type exists
                if (!typeExists)  throw new Error(`Transaction Type pubID=${typeExists} doesn't exist.`);

                res.json(await txn.save()); 
            }
            catch(error) { log(error); res.status(400).send({message: error}); }
        });

        expressInstance.post(`/api/finance/transactions/remove`, async (req:any,res:any) =>
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            var idToRemove = req.body.id;
            try { res.json(await TransactionModel.findById({"pubID":idToRemove}).deleteOne()); }
            catch(error) { res.status(400); res.json( { errors: error.errors } ); }
        });

        expressInstance.post(`/api/finance/containers/add`, async (req:any,res:any) =>
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            try 
            { 
                var newTxnID = genUUID();
                res.json(await new ContainerModel({...req.body, "pubID": newTxnID}).save()); 
            }
            catch(error) { log(error); res.status(400); res.json( { errors: error } ); }
        });

        expressInstance.post(`/api/finance/containers/remove`, async (req:any,res:any) =>
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            var idToRemove = req.body.id;
            try {  res.json(await ContainerModel.findById({"pubID":idToRemove}).deleteOne()); }
            catch(error) { res.status(400); res.json( { errors: error.errors } ); }
        });

        expressInstance.get(`/api/finance/charts/totalValue`, async (req:any,res:any) => 
        {
            try 
            {
                // Check for permission and login
                if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

                res.json(await TotalValueRecordModel.find({}));   
            }
            catch(error) { res.status(400); res.json( { errors: error.errors } ); }
        });

        expressInstance.post(`/api/finance/login`, async (req:any, res:any) => 
        {
            try
            {
                let accessToken = await AccountClass.login(req.body.username, req.body.password, req.get("User-Agent"));
                let jwtToken = "Bearer " + await accessToken.generateJWTBearer();
                res.json({"token": jwtToken});
            }
            catch(ex)
            {
                if (ex == "Username or password don't match")
                {
                    res.status(401);
                    res.json( {"error": ex} );
                    return;
                }
                res.status(400);
                res.json( {"error": ex} );
            }
        });

        express_instance.post("/api/finance/accounts/register", async(req,res) => 
        {
            try
            {
                let newlyCreatedAccount = await AccountClassModel.register(req.body.username, req.body.password);
                res.json(
                {
                    username: newlyCreatedAccount.username,
                    id: newlyCreatedAccount["_id"]
                });
            }
            catch(ex)
            {
                console.log(ex);
                res.status(400);
                res.json( { "error": ex });
            }
        });

        // Update stats every hour
        (async () =>
        {
            var updateFunc = async () => { await TotalValueRecordClass.UpdateHistory(); };
            setInterval(updateFunc, 60000 * 30);
            await updateFunc();
        })();

        // Update rate from coingecko every 30 min
        (async () => 
        {
            var updateFunc = async () => 
            {
                (await CurrencyModel.find()).forEach(currency => 
                {
                    if (currency.dataSource == undefined) return;
    
                    var options =
                    {
                        method: 'GET',
                        hostname: currency.dataSource.jsonURLHost, port: null, path: currency.dataSource.jsonURLPath,
                    };
            
                    var isNum = (num: any) => (typeof(num) === 'number' || typeof(num) === "string" && num.trim() !== '') && !isNaN(num as number);
                    var onError = (err,e) => { logRed(`Error while fetching ${currency.dataSource} for ${currency.symbol}: ${JSON.stringify(err)}`); }; 
                    var onClose = async wholeData => 
                    {
                        try
                        {
                            var json = JSON.parse(wholeData);
                            var value = jmespath.search(json, currency.dataSource.jmesQuery);
                            var fullPath = `${currency.dataSource.jsonURLHost}${currency.dataSource.jsonURLPath}`
                            
                            if (value == undefined)
                            {
                                logRed(`The query "${currency.dataSource.jmesQuery}" returned from ${fullPath} for ${currency.symbol} is undefined.`);
                            }
                            else if (!isNum(value)) 
                            {
                                logRed(`The query "${currency.dataSource.jmesQuery}" returned from ${fullPath} for ${currency.symbol} is not a number. (${JSON.stringify(value)})`);
                            }
                            else
                            {
                                logGreen(`Successfully fetched ${currency.symbol} price ${value}.`);
                                currency.rate = Number.parseFloat(value);
                                await currency.save();
                            }
                        }
                        catch (error)  
                        {
                            if (wholeData.includes("502")) return;
                            logRed(`Error while fetching ${currency.dataSource} for ${currency.symbol}: ${wholeData}`);
                            logRed(error);
                        }  
                    };
            
                    setTimeout(() => { shortcuts.httpsRequest(options, undefined, onClose, onError); }, 5000 * Math.random());
                });
    
            };
            setInterval(updateFunc, 60000 * 60);
            updateFunc();
        })();

        // Sync wallets transactions from blockchain every 60 mins
        (async () => 
        {
            var syncWalletFunc = async () => 
            {
                // get all watchdogs and update them.
                var allWatchdogs = (await CryptoWalletWatchDogModel.find());
                var cache = await DataCache.ensure();
    
                for (let watchdogIndex = 0; watchdogIndex < allWatchdogs.length; watchdogIndex++) 
                {
                    let watchdog:CryptoWalletWatchDogClass = allWatchdogs[watchdogIndex];
                    let txAdded:TransactionClass[] = await watchdog.synchronizeAllTokens(cache);
                    if (txAdded.length > 0) logGreen(`${txAdded.length} txns added for container=${watchdog.linkedContainerID} from blockchain`);
                }
            };
            setInterval(syncWalletFunc, 60000 * 120);
            syncWalletFunc();
        })();
    }
    catch (e) { logRed(e); }
}