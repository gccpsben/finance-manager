import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { CurrencyClass, CurrencyModel } from "./currency";

@modelOptions ( { schemaOptions: { autoCreate: false , _id : false } } )
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

        if (respectiveCurrency) return respectiveCurrency!.rate * this.value;
        else throw new Error(`Currency with ID=${this.currencyID} is not found.`);
    }
}
export const AmountModel = getModelForClass(AmountClass);