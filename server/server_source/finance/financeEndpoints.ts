
// /**
//  * Check for missing indexes, incorrect collection names etc... If any errors, are found, fix them.
//  * Will abort if fatal errors are found.
//  */
// export async function checkDatabaseIntegrity()
// {
//     await TransactionModel.collection.createIndex(
//     {
//         "title": "text"
//     });
//     logGreen(`No database issue found!`);
// }

// export async function initialize (express_instance:Express)
// {
//     try 
//     {
//         initializeV1Endpoints(express_instance);
//         await checkDatabaseIntegrity();
    
//         // Update stats every hour
//         (async () =>
//         {
//             let updateFunc = async () => { await TotalValueRecordClass.UpdateHistory(); };
//             setInterval(updateFunc, 60000 * 30);
//             await updateFunc();
//         })();

//         // Update rate from coingecko every 30 min
//         (async () => 
//         {
//             let updateFunc = async () => 
//             {
//                 (await CurrencyModel.find()).forEach(async currency => { await currency.updateRate(); });
//             };
//             setInterval(updateFunc, 60000 * 60);
//             updateFunc();
//         })();

//         // Sync wallets transactions from blockchain every 60 mins
//         (async () => 
//         {
//             let syncWalletFunc = async () => 
//             {
//                 // get all watchdogs and update them.
//                 let allWatchdogs = await CryptoWalletWatchDogModel.find();
//                 let cache = await DataCache.ensure();
    
//                 for (let watchdogIndex = 0; watchdogIndex < allWatchdogs.length; watchdogIndex++) 
//                 {
//                     let watchdog:CryptoWalletWatchDogClass = allWatchdogs[watchdogIndex];
//                     let container = cache.allContainers.find(x => x.pubID == watchdog.linkedContainerID);
//                     let txAdded:TransactionClass[] = await watchdog.synchronizeAllTokens(cache);
//                     if (txAdded.length > 0) logGreen(`${txAdded.length} txns added for container=${container.name} from blockchain`);
//                     else logGreen(`No extra txn added for container=${container.name}`);
//                 }
//             };
//             setInterval(syncWalletFunc, 60000 * 120);
//             setTimeout(syncWalletFunc, 10000);
//         })();
//     }
//     catch (e) { logRed(e); }
// }