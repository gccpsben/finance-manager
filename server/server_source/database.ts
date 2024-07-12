import { logGreen, logRed, log, logYellow } from "./extendedLog";
import * as mongo from "mongodb";
import * as mongoose from "mongoose";
import { TransactionModel } from "./finance/transaction";

export let databaseURL:string;

export const databaseTimeoutMS = 60000 as number | undefined;
export let databaseToUse = undefined as undefined | string;

export async function checkDatabaseIntegrity()
{
    await TransactionModel.collection.createIndex({ "title": "text" });
    logGreen(`No database issue found!`);
}

export function loadDatabaseSettingsFromEnv()
{
    databaseToUse = process.env.FINANCE_DB_NAME;
}

export async function init(url:string)
{
    try
    {
        loadDatabaseSettingsFromEnv();
        
        if (process.env.FINANCE_DB_FULL_URL == undefined) throw new Error("FINANCE_DB_FULL_URL is not defined.");
        
        if (databaseToUse == undefined) throw new Error("databaseToUse is not defined in the env file.");

        logYellow(`Connecting to finance database "${databaseToUse}"...`);
        mongoose.set('strictQuery', true);
        await mongoose.connect(url, { dbName: databaseToUse, connectTimeoutMS: databaseTimeoutMS, maxPoolSize:30 });

        if (process.env.MONGOOSE_VERBOSE == 'true')
        {
            mongoose.set('debug', function (coll, method, query, doc) 
            { 
                let time = new Date().toISOString();
                log(`${time} [MONGOSE] ${coll}.${method} ${JSON.stringify(query)}`); 
            });
        }
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
