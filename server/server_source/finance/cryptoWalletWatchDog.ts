import { getModelForClass, modelOptions, mongoose, prop } from "@typegoose/typegoose";
import { DataCache } from "./dataCache";
import { TransactionClass, TransactionModel, TransactionMovementType } from "./transaction";
import { genUUID } from "../uuid";
import axios from "axios";
import { log, logRed } from "../extendedLog";

@modelOptions ( { schemaOptions: { autoCreate:false, _id : false }, existingMongoose: mongoose } )
export class WalletTokenClass
{
    @prop( { required: true } )
    publicAddress!: string

    @prop( { required: true, enum:["BTC", "LTC", "XNO"] } )
    chainType!: string

    @prop( { required: true } )
    currencyID!: string
}
export const WalletTokenModel = getModelForClass(WalletTokenClass);

@modelOptions ( {schemaOptions: { collection: "cryptoWalletWatchdogs" }, existingMongoose: mongoose } )
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

    // Check for a transaction already added.
    // If it's not added already, append and save them to the database, and return the TransactionClass created.
    // Will return undefined if no transaction was added.
    public async tryAppendTxn
    (
        dateOfTransaction:Date, nativeAmount:number, 
        txType: TransactionMovementType, token: WalletTokenClass, cache?: DataCache
    ) : Promise<void | TransactionClass>
    {
        await DataCache.ensureTransactions(cache);

        let txAmountString:string = nativeAmount.toFixed(9);
        let keyToMatch:string = txType == "Receive" ? "to" : "from";

        // check if the transaction is found in the record
        let recordFound = cache!.allTransactions!.some(savedTransaction => 
        {
            let isDateMatch = new Date(savedTransaction.date).toISOString() == dateOfTransaction.toISOString();
            if (!isDateMatch) return false;
            if (savedTransaction[keyToMatch] == undefined) return false;
            if (savedTransaction[keyToMatch].amount.value != Number.parseFloat(txAmountString)) return false;
            if (savedTransaction[keyToMatch].containerID != this.linkedContainerID) return false;
            return true;
        });
        
        // If record found, don't preceed.
        if (recordFound) return undefined;

        log(`CryptoWalletWatchDog: Added Tx from ${dateOfTransaction.toISOString()} of ${token.publicAddress}`);

        let transactionBodyToAdd:any = 
        {
            "title": `${token.chainType} Transaction`,
            "typeID": this.defaultTransactionTypeID,
            "date": dateOfTransaction.toISOString(),
            "isFromBot": true,
            "pubID": genUUID()
        };

        transactionBodyToAdd[keyToMatch] = 
        {
            containerID: this.linkedContainerID,
            amount: 
            {
                currencyID: token.currencyID,
                value: Number.parseFloat(txAmountString)
            }
        }

        let newlyAddedTx = (await new TransactionModel(transactionBodyToAdd).save());
        return newlyAddedTx;
    }

    /**
     * Sync all the transactions from the blockchain (BTC/LTC).
     * @param token 
     * @param cache 
     * @returns a list of newly added tx from the bitcoin mainnet chain.
     */
    public async syncBTCish(token: WalletTokenClass, cache?: DataCache) : Promise<Array<TransactionClass>>
    {
        if (token.chainType != "LTC" && token.chainType != "BTC") 
            throw new Error(`The given token is not on the BTC or LTC chain.`);

        let addedTxns: any[] = []; // this will be the return value

        let fetchResponse = await axios.get(`https://api.blockcypher.com/v1/${token.chainType.toLowerCase()}/main/addrs/${token.publicAddress}`);
        if (fetchResponse.status != 200) 
        {
            logRed(`Error fetching blockchain data for watchdog id=${this.pubID}: E${fetchResponse.status}: ${fetchResponse.data}`);
            return [];
        }

        let response = await fetchResponse.data;
        if (response.txrefs == undefined) return [];

        // get all transactions of the fetched wallet
        for (let txIndex = 0; txIndex < response.txrefs.length; txIndex++)
        {
            let txref = response.txrefs[txIndex];

            if (txref.confirmations < 10) continue;
            if (txref.confirmed == undefined) continue;

            let addedTx = await this.tryAppendTxn
            (
                new Date(txref.confirmed), 
                txref.value * 0.00000001, 
                txref.spent == undefined ? "Spent" : "Receive", 
                token,
                cache
            );

            if (addedTx != undefined) addedTxns.push(addedTx);
        }

        return addedTxns;
    }

    // returns a list of newly added tx.
    public async syncXNO(token: WalletTokenClass,  cache?: DataCache) : Promise<Array<TransactionClass>>
    {
        try
        {
            if (token.chainType !== "XNO") 
                throw new Error(`The given token is not on the XNO chain.`);
            
            let addedTxns: any[] = []; // this will be the return value

            let fetchResponse = await axios.post(`https://www.nanolooker.com/api/rpc`, 
            {
                "action": "account_history",
                "account": token.publicAddress,
                "count":"9999"
            });

            if (fetchResponse.status != 200) 
            {
                logRed
                (
                    `Error fetching blockchain data for watchdog id=${this.pubID}: ` +
                    `E${fetchResponse.status}: ${fetchResponse.data}`
                );
                return [];
            }

            let response = await fetchResponse.data;

            if (response.error == "Bad account number") 
            {
                logRed
                (
                    `Error fetching blockchain data for watchdog id=${this.pubID}: of chain XNO:` + 
                    `The given public address ${token.publicAddress} cannot be found.`
                );
                return [];
            }
            else if (response.error != undefined) 
            {
                logRed(`Error fetching blockchain data for watchdog id=${this.pubID}: of chain XNO: ${response.error}`);
                return [];
            }
            else
            {
                let allTransactions = response.history;
                for (let i = 0; i < allTransactions.length; i++)
                {
                    let item = allTransactions[i];
                    if (item['confirmed'] != 'true') continue;

                    let addedTx = await this.tryAppendTxn
                    (
                        new Date(Number.parseInt(item["local_timestamp"]) * 1000),
                        Number.parseInt(item["amount"]) / 10e+29,
                        item["type"] == "receive" ? "Receive" : "Spent",
                        token,
                        cache
                    );

                    if (addedTx != undefined) addedTxns.push(addedTx);
                }
            }

            return addedTxns;
        }
        catch(ex)
        {
            console.log(`Error trying to update address info of ${token.publicAddress} in chain ${token.chainType}, error: ${ex}`);
            return [];
        }
    }

    // returns a list of newly added tx.
    public async synchronizeAllTokens(cache?:DataCache):Promise<Array<TransactionClass>>
    {
        await DataCache.ensureTransactions(cache);
        log(`Syncing all tokens in watchdog for container "${this.linkedContainerID}"`);

        let txAdded:Array<TransactionClass> = [];
        for (let tokenIndex = 0; tokenIndex < this.tokensSupported.length; tokenIndex++)
        {
            let tokenToSync = this.tokensSupported[tokenIndex];
            try 
            {
                log(`Syncing chain "${tokenToSync.chainType}"`);

                if (tokenToSync.chainType == "LTC" || tokenToSync.chainType == "BTC") 
                txAdded = txAdded.concat(await this.syncBTCish(tokenToSync, cache));

                else if (tokenToSync.chainType == "XNO") 
                txAdded = txAdded.concat(await this.syncXNO(tokenToSync, cache));
            }
            catch(error) 
            { 
                if (error && error.status == 429) logRed(`Limit reached trying to update blockchain RPC for chain=${tokenToSync.chainType}, error=${error}`); 
                else logRed(`Error trying to update blockchain RPC for chain=${tokenToSync.chainType}, error=${error}`); 
            }
        }
        return txAdded;
    }
}
export const CryptoWalletWatchDogModel = getModelForClass(CryptoWalletWatchDogClass);