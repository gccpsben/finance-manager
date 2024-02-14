import { log, logGreen, logRed } from "./extendedLog";
import { CryptoWalletWatchDogClass, CryptoWalletWatchDogModel } from "./finance/cryptoWalletWatchDog";
import { CurrencyModel } from "./finance/currency";
import { DataCache } from "./finance/dataCache";
import { TotalValueRecordClass } from "./finance/totalValueRecord";
import { TransactionClass } from "./finance/transaction";
import { isDevelopment, isUnitTest } from "./server";

export async function initialize()
{
    setTimeout(() => 
    {
        try 
        {
            // Update stats every hour
            // this is obsolete
            // (async () =>
            // {
            //     let updateFunc = async () => { await TotalValueRecordClass.UpdateHistory(); };
            //     setInterval(updateFunc, 60000 * 30);
            //     await updateFunc();
            // })();

            // Update rate from coingecko every 30 min
            (async () => 
            {
                let updateFunc = async () => 
                {
                    (await CurrencyModel.find()).forEach(async currency => { await currency.updateRate(); });
                };
                setInterval(updateFunc, 60000 * 60);

                if (!isDevelopment) updateFunc();
                else if (!isUnitTest) log("Not updating coingecko upon server start due to being in development mode.");
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
                if (!isDevelopment) setTimeout(syncWalletFunc, 10000);
                else if (!isUnitTest) log("Not fethcing blockchain upon server start due to being in development mode.");

            })();
        }
        catch (e) { logRed(e); }
    }, 1000);
}