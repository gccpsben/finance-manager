import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";

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

@modelOptions ( {schemaOptions: { collection: "currencies" }} )
export class CurrencyClass
{
    @prop( { required: true } )
    pubID: string
    @prop( { required: true } )
    name!: string;
    @prop( { required: true } )
    symbol!: string;
    @prop( { required: true } )
    rate!: number;
    @prop( { required: false } )
    dataSource!: CurrencyDataSourceClass;

    public static async isExist(currencyID: string) : Promise<boolean> 
    { 
        return (await CurrencyModel.find( { pubID: currencyID })).length > 0 
    };
}
export const CurrencyModel = getModelForClass(CurrencyClass);