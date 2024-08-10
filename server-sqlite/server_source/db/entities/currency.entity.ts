import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, PrimaryColumn, OneToOne, JoinColumn, Check, Unique, Index, AfterLoad, EntitySubscriberInterface, EventSubscriber, InsertEvent } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { IsBoolean, IsDate, IsNotEmpty, isNumber, IsObject, IsOptional, IsString, MaxLength, validate, ValidationError } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";

@Entity() 
@Unique("UniqueCurrencyNameWithinUser",["name", "owner"]) // For each user, no currencies with the same name is allowed
@Unique("UniqueCurrencyTickerWithinUser",["ticker", "owner"]) // For each user, no currencies with the same ticker is allowed
@Check(/*sql*/`CASE WHEN fallbackRateAmount IS NOT NULL THEN NOT isBase ELSE isBase END`) // If isBase then fallbackRateAmount must be null.
@Check(/*sql*/`CASE WHEN NOT isBase THEN fallbackRateAmount IS NOT NULL ELSE fallbackRateAmount IS NULL END`) // If not isBase then fallbackRateAmount must also not be null.
@Check(/*sql*/`CASE WHEN NOT isBase THEN fallbackRateCurrencyId IS NOT NULL ELSE fallbackRateCurrencyId IS NULL END`) // If not isBase then refCurrency must also not be null
export class Currency extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({nullable: false})
    @IsNotEmpty()
    @IsString() 
    @MaxLength(128)
    name: string;

    @Column({nullable: true}) 
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    fallbackRateAmount: string | null;

    @Column( { nullable: true })
    fallbackRateCurrencyId: string;

    @ManyToOne(type => Currency, currency => currency.fallbackRateCurrency, { nullable: true })
    @JoinColumn()
    @EnsureNotPlainForeignKey() 
    fallbackRateCurrency: Omit<Omit<Currency, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey() 
    owner: User;

    @Column()
    @IsBoolean()
    @IsNotEmpty()
    isBase: boolean;

    @Column()
    @IsNotEmpty()
    ticker: string;

    @BeforeInsert()
    @BeforeUpdate()
    public async validate()
    {
        await super.validate();

        if (!!this.fallbackRateCurrency !== (!!this.fallbackRateAmount)) 
        { 
            const error = new ValidationError();
            error.target = this;
            error.constraints = { "AmountAndRefCurrency": `Amount and refCurrency must be defined along with each other if one of them is defined.` }
            throw error;
        }       

        // Ensure only 1 base currency is for each user.
        if (this.isBase && await CurrencyRepository.getInstance().count
        (
            {
                where: 
                { 
                    owner: { id: this.owner.id }, 
                    isBase: true 
                },
                relations: { owner: true }
            }
        ) >= 1)
        {
            const error = new ValidationError();
            error.target = this;
            error.constraints = { "RepeatedBaseCurrency": `Each user should have only 1 base currency.` }
            throw error;
        }
    }

    public isCurrencyBase()
    {
        return this.fallbackRateAmount === null || this.fallbackRateAmount === undefined;
    }
}

export type RateHydratedCurrency = 
{
    currency: Currency,
    rateToBase: string
};

export type RateHydratedPrimitiveCurrency = 
{
    currency: SQLitePrimitiveOnly<Currency>,
    rateToBase: string
};