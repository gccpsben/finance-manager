import { getModelForClass, modelOptions, mongoose, prop } from "@typegoose/typegoose";
import { CurrencyClass, CurrencyModel } from "./currency";
import { logYellow } from "../extendedLog";

@modelOptions ( { schemaOptions: { autoCreate: false , _id : false }, existingMongoose: mongoose  } )
export class AmountClass
{
    @prop({required:true})
    public currencyID!: string;

    @prop({required:true})
    public value!: number;

    // If you wish not to fetch currencies from db again, provide a list of all currencies.
    public async getValue(allCurrencies?:CurrencyClass[])
    {
        let respectiveCurrency:CurrencyClass|undefined|null;
        if (allCurrencies == undefined) respectiveCurrency = await CurrencyModel.findOne({pubID: this.currencyID});
        else respectiveCurrency = allCurrencies!.find(c => c.pubID?.toString() == this.currencyID);

        if (respectiveCurrency) 
        {
            let rate = await respectiveCurrency.getLatestRate();
            return rate * this.value;
        }
        else throw new Error(`Currency with ID=${this.currencyID} is not found.`);
    }

    /**
     * Given 2 objects, add each objects key-value pairs to each other. Keys will be added if needed.
     * Example ``{ "a":1, "b":2 } + { "b":2, "c":3 } = { "a":1, "b":4, "c":3 }``
     */
    public static addObject(object1: {[key:string]:number}, object2: {[key:string]:number})
    {
        let result: {[key:string]:number} = {};
        let allKeys = Array.from(new Set([...Object.keys(object1), ...Object.keys(object2)]));
        for (let key of allKeys) result[key] = (object1[key] ?? 0) + (object2[key] ?? 0);
        return result;
    }

    /**
     * Given 2 objects, substract object2 from object1 key-value pairs to each other. Keys will be added if needed.
     * Example ``{ "a":1, "b":2 } - { "b":2, "c":3 } = { "a":1, "b":0, "c":-3 }``
     */
    public static substractObject(object1: {[key:string]:number}, object2: {[key:string]:number})
    {
        let result: {[key:string]:number} = {};
        let allKeys = Array.from(new Set([...Object.keys(object1), ...Object.keys(object2)]));
        for (let key of allKeys) result[key] = (object1[key] ?? 0) - (object2[key] ?? 0);
        return result;
    }
}
export const AmountModel = getModelForClass(AmountClass);