import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { DataCache } from "./dataCache";
import { ContainerClass } from "./container";

@modelOptions ( {schemaOptions: { collection: "totalValueHistory" }} )
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
