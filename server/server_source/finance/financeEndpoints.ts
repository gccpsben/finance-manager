
import { logGreen, logRed, log } from "../extendedLog";
import { Express, Request, Response } from "express";
import { genUUID } from "../uuid";
import { AccessTokenClassModel } from "../accessToken";
import { CurrencyModel } from "./currency";
import { TransactionClass, TransactionModel, TransactionTypeModel } from "./transaction";
import { TotalValueRecordClass, TotalValueRecordModel } from "./totalValueRecord";
import { AccountClass, AccountClassModel } from "../account";
import { CryptoWalletWatchDogClass, CryptoWalletWatchDogModel } from "./cryptoWalletWatchDog";
import { DataCache } from "./dataCache";
import { ContainerClass, ContainerModel } from "./container";

let jmespath = require('jmespath');
const shortcuts = require("../supexShortcuts");

export function initializeV1Endpoints(express: Express)
{
    // #region Transactions
    express.get("/api/v1/finance/transactions", async (req, res) => 
    {
        try
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) return res.status(401).json({});

            // Deconstrcut query
            let query = req.query;
            let startingIndex = query.start ? parseInt(query?.start.toString()) : undefined;
            let endingIndex = query.end ? parseInt(query?.end.toString()) : undefined;
            let searchText = query.text ? query?.text.toString() : undefined;
            let txnID = query.pubid ? query?.pubid.toString() : undefined;
            let onlyUnresolved = query.onlyunresolved == "true";

            // Postprocess query
            let rangeFullyDefined = startingIndex !== undefined && endingIndex !== undefined;
            
            // Validate query args
            if (rangeFullyDefined && startingIndex > endingIndex)
                throw new Error(`Starting index must not be smaller than ending index.`);

            // Process queries
            let currencies = await CurrencyModel.find();
            let queryChain = TransactionModel.find();

            // (If txnID is given, skip everything and return the txn only)
            if (txnID)
            {
                let txnObject = await TransactionModel.findOne({pubID: txnID});
                if (txnObject == undefined) res.status(404).json({});
                else
                {
                    res.json(
                    {
                        ...txnObject.toJSON(),
                        changeInValue: await txnObject.getChangeInValue(currencies)
                    });
                }
                return;
            }

            // Filter by name (if any)
            if (searchText !== undefined) queryChain = queryChain.find( {"$text": {"$search": searchText.toString()}} );
            queryChain = queryChain.sort({"date":-1});

            // Execute query
            let originalTxns = await queryChain as any;

            // Filter based on resolution, and calculate changeInValue in the process
            await (async function() 
            {
                let tempArray = [] as any;
                for (let index = 0; index < originalTxns.length; index++) 
                {
                    let tx = originalTxns[index];

                    if (onlyUnresolved && !tx.isTypePending) continue;
                    if (onlyUnresolved && (tx.isTypePending && tx.isResolved)) continue;

                    tempArray.push(
                    {
                        ...tx.toJSON(),
                        "changeInValue": await tx.getChangeInValue(currencies)
                    });
                }
                originalTxns = tempArray;
            })();

            let originalLength = originalTxns.length;

            // Calculate total value change, (since the changeInValue is already calculated)
            let totalValueChange = originalTxns.reduce((acc, item) => { return acc + item.changeInValue }, 0);
            
            // Pagination should not be done in the DB side, since we lose the original count of items in array.
            // Do this in the last
            let pagedTxns = rangeFullyDefined ? originalTxns.slice(startingIndex, endingIndex) : originalTxns;

            res.json(
            {
                totalItems: originalLength,
                startingIndex: Math.min(startingIndex, originalLength),
                endingIndex: Math.min(endingIndex, originalLength),
                rangeItems: pagedTxns,
                totalValueChange: totalValueChange
            }); 
        }
        catch(error) { log(error); res.status(400).send({message: error}); }
    });
    
    express.post("/api/v1/finance/transactions", async (req, res) =>
    {
        try 
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            let newTxnID = genUUID();
            let txn = new TransactionModel(
            {
                ...req.body, 
                "pubID": newTxnID,
                "isFromBot": false
            }); 

            let fromContainerID = req.body?.from?.containerID ?? undefined;
            let toContainerID = req.body?.to?.containerID ?? undefined;
            let typeID = req.body?.typeID ?? undefined;
            let fromContainerPass = req.body?.from ? await ContainerModel.isExist(fromContainerID) : true;
            let toContainerPass = req.body?.to ? await ContainerModel.isExist(toContainerID) : true;
            let typeExists = req.body?.typeID && await TransactionTypeModel.isExist(typeID);

            // if (req.body.date != undefined) txn.date = new Date(req.body.date);

            // Check if containers exist
            if (!fromContainerPass || !toContainerPass) throw new Error(`Container pubID=${fromContainerID || toContainerID} doesn't exist.`);

            // Check if type exists
            if (!typeExists)  throw new Error(`Transaction Type pubID=${typeExists} doesn't exist.`);

            res.json(await txn.save()); 
        }
        catch(error) { log(error); res.status(400).send({message: error}); }
    });

    express.delete(`/api/v1/finance/transactions`, async (req,res) =>
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        let idToRemove = req.body.id;
        try { res.json(await TransactionModel.findById({"pubID":idToRemove}).deleteOne()); }
        catch(error) { res.status(400); res.json( { errors: error.errors } ); }
    });

    express.post(`/api/v1/finance/transactions/resolve`, async (req, res) => 
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
    //#endregion

    // #region Containers
    express.get(`/api/v1/finance/containers`, async (req:any ,res:any) => 
    { 
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        res.json(await ContainerClass.getAllContainersTotalBalance()); 
    });

    express.post(`/api/v1/finance/containers/add`, async (req:any,res:any) =>
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        try 
        { 
            let newTxnID = genUUID();
            res.json(await new ContainerModel({...req.body, "pubID": newTxnID}).save()); 
        }
        catch(error) { log(error); res.status(400); res.json( { errors: error } ); }
    });

    express.post(`/api/v1/finance/containers/remove`, async (req:any,res:any) =>
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        let idToRemove = req.body.id;
        try {  res.json(await ContainerModel.findById({"pubID":idToRemove}).deleteOne()); }
        catch(error) { res.status(400); res.json( { errors: error.errors } ); }
    });
    // #endregion

    // #region Currencies
    express.get(`/api/v1/finance/currencies`, async (req:any, res:any) => 
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }
        
        res.json(await CurrencyModel.find()); 
    });

    express.post(`/api/v1/finance/currencies/add`, async (req:any, res:any) => 
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
    //#endregion

    // #region Tx Types
    express.get(`/api/v1/finance/transactionTypes`, async (req:any, res:any) => 
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        res.json(await TransactionTypeModel.find()); 
    });
    express.post(`/api/v1/finance/types/add`, async (req:any, res:any) => 
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
    //#endregion

    // #region Graphs
    express.get(`/api/v1/finance/graphs`, async (req: Request, res:Response) => 
    {
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        res.status(200).json(await ContainerClass.getExpensesAndIncomes());
    });

    express.get(`/api/v1/finance/charts/totalValue`, async (req:any,res:any) => 
    {
        try 
        {
            // Check for permission and login
            if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

            res.json(await TotalValueRecordModel.find({}));   
        }
        catch(error) { res.status(400); res.json( { errors: error.errors } ); }
    });

    express.get(`/api/v1/finance/summary`, async (req:any, res:any) => 
    { 
        // Check for permission and login
        if (!await AccessTokenClassModel.isRequestAuthenticated(req)) { res.status(401).json({}); return; }

        let allTxns = (await TransactionModel.find());
        let allCurrencies = await CurrencyModel.find();
        let oneWeekAgoDate = new Date();  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7);
        let oneMonthAgoDate = new Date(); oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);

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

        let output = 
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
    // #endregion

    // #region Accounts
    express.post("/api/v1/finance/accounts/register", async (req,res) => 
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
            res.status(400).json( { "error": ex });
        }
    });
    express.post(`/api/v1/finance/login`, async (req:any, res:any) => 
    {
        try
        {
            let body = req.body;
            let username = body.username;
            let password = body.password;
            let accessToken = await AccountClass.login(username, password, req.get("User-Agent"));
            let jwtToken = `Bearer ${await accessToken.generateJWTBearer()}`;
            res.json({"token": jwtToken});
        }
        catch(ex)
        {
            let statusCode = ex == "Username or password don't match" ? 401 : 400;
            res.status(statusCode).json( {"error": ex} );
        }
    });
    // #endregion
}

/**
 * Check for missing indexes, incorrect collection names etc... If any errors, are found, fix them.
 * Will abort if fatal errors are found.
 */
export async function checkDatabaseIntegrity()
{
    await TransactionModel.collection.createIndex(
    {
        "title": "text"
    });
    logGreen(`No database issue found!`);
}

export async function initialize (express_instance:Express)
{
    try 
    {
        initializeV1Endpoints(express_instance);
        await checkDatabaseIntegrity();
    
        // Update stats every hour
        (async () =>
        {
            let updateFunc = async () => { await TotalValueRecordClass.UpdateHistory(); };
            setInterval(updateFunc, 60000 * 30);
            await updateFunc();
        })();

        // Update rate from coingecko every 30 min
        (async () => 
        {
            let updateFunc = async () => 
            {
                (await CurrencyModel.find()).forEach(currency => 
                {
                    if (currency.dataSource == undefined) return;
    
                    let options =
                    {
                        method: 'GET',
                        hostname: currency.dataSource.jsonURLHost, 
                        port: null, 
                        path: currency.dataSource.jsonURLPath,
                    };
            
                    let isNum = (num: any) => (typeof(num) === 'number' || typeof(num) === "string" && num.trim() !== '') && !isNaN(num as number);
                    let onError = err => { logRed(`Error while fetching ${currency.dataSource} for ${currency.symbol}: ${JSON.stringify(err)}`); }; 
                    let onClose = async wholeData => 
                    {
                        try
                        {
                            let json = JSON.parse(wholeData);
                            let value = jmespath.search(json, currency.dataSource.jmesQuery);
                            let fullPath = `${currency.dataSource.jsonURLHost}${currency.dataSource.jsonURLPath}`
                            
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
            let syncWalletFunc = async () => 
            {
                // get all watchdogs and update them.
                let allWatchdogs = await CryptoWalletWatchDogModel.find();
                let cache = await DataCache.ensure();
    
                for (let watchdogIndex = 0; watchdogIndex < allWatchdogs.length; watchdogIndex++) 
                {
                    let watchdog:CryptoWalletWatchDogClass = allWatchdogs[watchdogIndex];
                    let container = cache.allContainers.find(x => x.pubID == watchdog.linkedContainerID);
                    let txAdded:TransactionClass[] = await watchdog.synchronizeAllTokens(cache);
                    if (txAdded.length > 0) logGreen(`${txAdded.length} txns added for container=${container.name} from blockchain`);
                    else logGreen(`No extra txn added for container=${container.name}`);
                }
            };
            setInterval(syncWalletFunc, 60000 * 120);
            setTimeout(syncWalletFunc, 10000);
        })();
    }
    catch (e) { logRed(e); }
}