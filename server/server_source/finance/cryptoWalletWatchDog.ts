import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { DataCache } from "./dataCache";
import { TransactionClass, TransactionModel, TransactionMovementType } from "./transaction";
import { genUUID } from "../uuid";
import axios from "axios";
import { log, logRed } from "../extendedLog";

@modelOptions ( { schemaOptions: { autoCreate:false, _id : false }} )
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

@modelOptions ( {schemaOptions: { collection: "cryptoWalletWatchdogs" }} )
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

        // returns a list of newly added tx from the bitcoin mainnet chain.
        // this function accepts both LTC and BTC chain
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

                    var fetchResponse = await axios.post(`https://rpc.nano.to`, 
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
                console.log(`Error trying to update address info of ${token.publicAddress} in chain ${token.chainType}, error: ${ex}`);
            }
        }

        let txAdded:Array<TransactionClass> = [];
        for (let tokenIndex = 0; tokenIndex < this.tokensSupported.length; tokenIndex++)
        {
            try 
            {
                var tokenToSync = this.tokensSupported[tokenIndex];
                if (tokenToSync.chainType == "LTC" || tokenToSync.chainType == "BTC") txAdded = txAdded.concat(await syncBTCish(tokenToSync));
                else if (tokenToSync.chainType == "XNO") txAdded = txAdded.concat(await syncXNO(tokenToSync));
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