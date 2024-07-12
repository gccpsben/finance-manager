import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { DataCache, ExpiringValueCache } from "./dataCache";
import { logGreen, logRed, logYellow } from "../extendedLog";
let jmespath = require('jmespath');

@modelOptions( 
{
    schemaOptions: 
    { 
        autoCreate: true, 
        _id:false, 
        collection: "currenciesRates", 
        timeseries: 
        {
            timeField: "date",
            metaField: "currencyPubID"
        } 
    }
} ) 
export class CurrencyRateClass
{
    @prop( {required: true, type: Date} )
    date: Date;
    @prop( {required: true, type: Number} )
    rate: number;
    @prop( {required: true, type: String} )
    currencyPubID: string;

    /**
     * Import a JSON containing all rates, and append them to the database.
     */
    public static async importJSON(jsonObject: CurrencyRateClass[])
    {
        let output = [];
        let containedPubIDs: Set<string> = new Set(); // a set of all appeared pubIDs, used to check if the currency given exists or not.

        for (let r of jsonObject) 
        {
            if (r.date.toString() === "Invalid Date") throw new Error(`An invalid date is found in the jsonObject.`);
            containedPubIDs.add(r.currencyPubID);
            output.push(new CurrencyRateModel(r));
        }

        for (let pubID of Array.from(containedPubIDs))
        {
            if ((await CurrencyModel.find({pubID: pubID})).length == 0) 
            throw new Error(`The given currency "${pubID}" doesn't exist.`);
        }

        await CurrencyRateModel.bulkSave(output);
    }

    /**
     * Import a JSON-string containing all rates, and append to the database. Will throw error if any item are invalid.
     * For all the Date-type fields, a ``new Date()`` will be called on them.
     * @param jsonRaw 
     */
    public static async importJSONRaw(jsonRaw: string)
    {
        let parsed = JSON.parse(jsonRaw);
        if (!parsed) throw new Error(`The given json is empty.`);
        if (!(parsed instanceof Array)) throw new Error(`The given json is not an array.`);
        parsed = parsed.map(x => 
        {
            let isDate = (new Date(x.date).toString() !== "Invalid Date");
            if (!isDate) throw new Error(`The given date "${x.date}" is invalid.`);
            let date = new Date(x.date);
            return { ...x, "date": date }
        });
        await CurrencyRateClass.importJSON(parsed);
    }
}
export const CurrencyRateModel = getModelForClass(CurrencyRateClass);

@modelOptions ( { schemaOptions: { autoCreate:false, _id : false } } )
export class CurrencyDataSourceClass
{
    @prop( { required: true } )
    jsonURLHost!: string;
    @prop( { required: true } )
    jsonURLPath!: string;
    @prop( { required: true } )
    jmesQuery!: string;
}
export const CurrencyDataSourceModel = getModelForClass(CurrencyDataSourceClass);

export type LatestRateHydratedCurrencyClass = CurrencyClass & { rate: number; _id: string; };

@modelOptions ( {schemaOptions: { collection: "currencies" }} )
export class CurrencyClass
{
    /**
     * This stores the cache of different rates of currencies. 
     * Will only fetch the latest rate if time expired.
     */
    static ratesCache = new ExpiringValueCache<number|undefined>(1000 * 60 * 60);

    @prop( { required: true } )
    pubID: string
    
    @prop( { required: true } )
    name!: string;

    @prop( { required: true } )
    symbol!: string;

    @prop( { required: false } )
    fallbackRate?: number;

    @prop( { required: false } )
    dataSource!: CurrencyDataSourceClass;

    public static async isExist(currencyID: string) : Promise<boolean> 
    { 
        return (await CurrencyModel.find( { pubID: currencyID })).length > 0 
    };

    public async updateRate()
    {
        if (this.dataSource == undefined) return;

        let isNum = (num: any) => (typeof(num) === 'number' || typeof(num) === "string" && num.trim() !== '') && !isNaN(num as number);
        let options =
        {
            method: 'GET',
            hostname: this.dataSource.jsonURLHost, 
            port: null, 
            path: this.dataSource.jsonURLPath,
        };

        try
        {    
            let response = await fetch(`https://${options.hostname}/${options.path}`);
            let json = await response.json();
            try
            {
                let value = jmespath.search(json, this.dataSource.jmesQuery);
                let fullPath = `${this.dataSource.jsonURLHost}${this.dataSource.jsonURLPath}`
                
                if (value == undefined) logRed(`The query "${this.dataSource.jmesQuery}" returned from ${fullPath} for ${this.symbol} is undefined.`);
                else if (!isNum(value))  logRed(`The query "${this.dataSource.jmesQuery}" returned from ${fullPath} for ${this.symbol} is not a number. (${JSON.stringify(value)})`);
                else
                {
                    let rate = new CurrencyRateModel(
                    {
                        currencyPubID: this.pubID,
                        rate: Number.parseFloat(value),
                        date: new Date(),
                    });
                    CurrencyRateModel.bulkSave([rate]);
                    logGreen(`Successfully fetched ${this.symbol} price ${value}.`);
                }
            }
            catch (error)  
            {
                if (response.status == 502) return;
                logRed(`Error while fetching ${this.dataSource} for ${this.symbol}: ${JSON.stringify(json)}`);
                logRed(error);
            }  
        }
        catch(err) { logRed(`Error while fetching ${this.dataSource} for ${this.symbol}: ${JSON.stringify(err)}`); }
    }

    public async getLatestRate()
    {
        let rate = await CurrencyClass.ratesCache.get(this.pubID, async (pubIDKey:string) => 
        {
            let potentialDocs: CurrencyRateClass[] = await CurrencyRateModel.aggregate(
            [
                { "$match": { currencyPubID: pubIDKey } },
                { "$sort": { date: -1 } },
                { "$limit": 1 }
            ]);
            if (potentialDocs.length == 0) return undefined;
            return potentialDocs[0].rate;
        });

        if (rate == undefined && this.fallbackRate != undefined) return this.fallbackRate;
        if (rate == undefined && this.fallbackRate == undefined) 
        {
            logRed(`For currency ${this.pubID}(${this.symbol}), there's no fallback value and rate datapoint!`);
        }

        return rate;
    }

    public static async getLatestRateHydratedCurrencies(cache? : DataCache | undefined)
    {
        // Hydrate the currencies documents with the latest rates
        let originals = cache?.allCurrencies || await CurrencyModel.find({});
        let hydrated: (Partial<CurrencyRateClass> & { rate: number })[] = [];
        
        for (let currency of originals)
        {
            hydrated.push({
                rate: await currency.getLatestRate(),
                ...currency["_doc"]
            });
        }

        return hydrated;
    }
}
export const CurrencyModel = getModelForClass(CurrencyClass);