import { getModelForClass, modelOptions, mongoose, prop } from "@typegoose/typegoose";
import { DataCache } from "./dataCache";
import { ContainerClass } from "./container";
import { TransactionClass, TransactionModel } from "./transaction";

@modelOptions ( {schemaOptions: { collection: "totalValueHistory" }, existingMongoose: mongoose } )
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
        let cache = await DataCache.ensure();
        let allRecords = await TotalValueRecordModel.find();
        let shouldAddNewRecord = false;

        if (allRecords.length == 0) shouldAddNewRecord = true;
        else
        {
            let lastRecord = allRecords.sort((a,b) => { return b.date.getTime() - a.date.getTime() })[0];
            if (new Date().getTime() - lastRecord.date.getTime() >= 60000 * 60) shouldAddNewRecord = true;
        }

        if (shouldAddNewRecord)
        {
            let currentTotalValue = (await ContainerClass.getAllContainersTotalBalance(cache)).reduce((acc, val) => { return acc + val.value }, 0);
            let newRecord = (new TotalValueRecordModel({date: new Date(), value: currentTotalValue}));
            await newRecord.save();
            return newRecord;
        }
        else return undefined;
    }
}
export const TotalValueRecordModel = getModelForClass(TotalValueRecordClass);

export class NetWorthCalculator
{
    public static async calculateHistory()
    {
        // const timeframeMs = 86400000; // a day
        // let oldestTxn: TransactionClass = await TransactionModel.aggregate( [ { "$sort": { date: 1 } }, { "$limit": 1 } ])[0];
        // let latestTxn: TransactionClass = await TransactionModel.aggregate( [ { "$sort": { date: -1 } }, { "$limit": 1 } ])[0];
        // if (!oldestTxn?.date || !latestTxn?.date) return [];
        
        // let currentTimestamp = oldestTxn.date.getTime();
        // let now = new Date().getTime();
        // let output: {[key: string]: number} = {};
        
        // let currenciesRates = {};



        // let inte: LinearInte = LinearInte.fromEntries();
    
        // while (currentTimestamp < now)
        // {
        //     let dateString = new Date(currentTimestamp).toISOString();
        //     output[dateString] = TotalValueRecordClass.get
    
        //     currentTimestamp += timeframeMs;
        // }

        
        
    }
}