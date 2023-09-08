import { logGreen, logRed, log, logYellow } from "./extendedLog";
import * as mongo from "mongodb";
import * as mongoose from "mongoose";

export let databaseURL:string;

export const databaseToUse = process.env.FINANCE_DB_NAME || "finance";

export async function init(url:string)
{
    try
    {
        if (process.env.FINANCE_DB_FULL_URL == undefined) throw new Error("FINANCE_DB_FULL_URL is not defined.");
        
        logYellow(`Connecting to finance database "${databaseToUse}"...`);
        mongoose.set('strictQuery', true);
        await mongoose.connect(url, { dbName: databaseToUse });

        if (process.env.MONGOOSE_VERBOSE == 'true')
            mongoose.set('debug', function (coll, method, query, doc) { log(`Mongoose Request: ${coll}.${method} ${JSON.stringify(query)}`); });
    }
    catch(e)
    {
        logRed(`Unable to connect to finance database...`);
        log(e);
    }
}

// export async function pingDatabase()
// {
//     await client.db("admin").command({ping: 1});
// }

export class Validators
{
    static intValidator = 
    {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value.'
    }
}

export class Types
{
    static requiredNumber = { type: Number, required: true }
    static requiredString = { type: String, required: true }
    static requiredDate =  { type: Date, required: true }
    static requiredBool = { type: Boolean, required: true }

    static optionalNumber = { type: Number, required: false }
    static optionalString = { type: String, required: false }
    static optionalDate =  { type: Date, required: false }
    static optionalBool = { type: Boolean, required: false }

    static requiredInt = 
    {
        type: Number,
        required: true,
        validate: Validators.intValidator
    }
}
