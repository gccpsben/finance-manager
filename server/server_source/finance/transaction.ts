import { getModelForClass, modelOptions, mongoose, prop } from "@typegoose/typegoose";
import { CurrencyClass } from "./currency";
import { AmountClass } from "./amount";

@modelOptions ( { schemaOptions: { autoCreate: false , _id : false }, existingMongoose: mongoose } )
export class ContainerBoundAmountClass
{
    @prop({required:true})
    public containerID!: string;
    
    @prop({required:true})
    public amount!: AmountClass;
}
export const ContainerBoundAmountModel = getModelForClass(ContainerBoundAmountClass);

/**
 * The type of a given transaction, "Receive" means the amount is added to the wallet. "Spent" means the amount is transferred out (spent).
 */
export type TransactionMovementType = "Receive" | "Spent";

@modelOptions ( { schemaOptions: { autoCreate: false , _id : false } , existingMongoose: mongoose} )
export class TransactionResolutionClass
{
    @prop({required:true})
    public date!: Date;
}
export const TransactionResolutionModel = getModelForClass(TransactionResolutionClass);

@modelOptions ( { schemaOptions: {  collection: "transactionTypes" }, existingMongoose: mongoose} )
export class TransactionTypeClass
{
    @prop( { required: true } )
    pubID: string;
    @prop( { required: true } )
    name!: string;
    @prop( { required: true } )
    isEarning!: boolean;
    @prop( { required: true } )
    isExpense!: boolean;

    public static async isExist(typeID: string) : Promise<boolean> 
    { 
        return (await TransactionTypeModel.find({pubID: typeID})).length > 0 
    };
}
export const TransactionTypeModel = getModelForClass(TransactionTypeClass);

@modelOptions ( {schemaOptions: { collection: "transactions", toJSON: { virtuals: true } }, existingMongoose: mongoose } )
export class TransactionClass
{
    @prop( { required: true } )
    pubID: string;

    @prop( { required: true } )
    date!: Date;

    @prop( { required: true } )
    title!: string;

    @prop( { required: false } )
    description?: string;

    @prop( { required: true } )
    typeID!: string;

    @prop( { required: true } )
    isFromBot!: boolean;

    @prop( { required: false, default: false } )
    /** Is the transaction not resolved when the record is added */
    isTypePending?: boolean;
    
    @prop( { required: false, default: undefined } )
    /** Is the pending transaction resolved */
    resolution?: TransactionResolutionClass;

    public get isResolved()
    {
        return this.isTypePending && this.resolution != undefined
    }
    
    @prop( { required: false, type: ContainerBoundAmountClass} )
    from?: ContainerBoundAmountClass;
    
    @prop( { required: false, type:ContainerBoundAmountClass } )
    to?: ContainerBoundAmountClass;

    // If you wish not to fetch currencies from db again, provide a list of all currencies.
    public async getChangeInValue(allCurrencies?:CurrencyClass[])
    {
        if (this.from == undefined && this.to != undefined) return await this.to.amount.getValue(allCurrencies);
        else if (this.from != undefined && this.to != undefined) return (await this.to.amount.getValue(allCurrencies) - await this.from.amount.getValue(allCurrencies));
        else if (this.from != undefined && this.to == undefined) return (await this.from.amount.getValue(allCurrencies)) * -1;
        return 0;
    }
}
export const TransactionModel = getModelForClass(TransactionClass);