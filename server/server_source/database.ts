import { logGreen, logRed, log, logBlue, getLog, logYellow } from "./extendedLog";
import * as mongo from "mongodb";
import * as mongoose from "mongoose";

export let client:mongo.MongoClient;
export let databaseURL:string;
export let mongooseClient: mongoose.Connection;

export async function init(url:string)
{
    try
    {
        if (process.env.FINANCE_DB_FULL_URL == undefined) throw new Error("FINANCE_DB_FULL_URL is not defined.");
        databaseURL = url;
        logYellow(`Connecting to finance database...`);
        client = new mongo.MongoClient(url);
        await this.client.db("admin").command({ping: 1});
        exports.mongooseClient = await mongoose.createConnection(url).asPromise();   
        logGreen(`Connected to finance database and set up mongoose.`);
        return this.client;
    }
    catch(e)
    {
        logRed(`Unable to connect to finance database...`);
        log(e);
    }
}

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
