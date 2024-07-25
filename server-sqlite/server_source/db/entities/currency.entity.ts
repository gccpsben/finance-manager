import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, PrimaryColumn, OneToOne, JoinColumn, Check, Unique, Index } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { IsBoolean, IsDate, IsNotEmpty, isNumber, IsString, MaxLength, validate, ValidationError } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";

@Entity() 
@Unique("UniqueCurrencyNameWithinUser",["currencyName", "owner"]) // For each user, no currencies with the same name is allowed
@Check(/*sql*/`CASE WHEN amount IS NOT NULL THEN NOT isBase ELSE isBase END`) // If isBase then amount must be null.
export class Currency extends EntityClass 
{ 
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({nullable: false}) 
    @IsNotEmpty()
    @IsString() 
    @MaxLength(128)
    currencyName: string;

    @Column({nullable: true}) 
    amount: string;

    @OneToOne(type => Currency, currency => currency.refCurrency, { nullable: true })
    @JoinColumn()
    refCurrency: Currency;

    @ManyToOne(type => User, user => user.accessTokens, { nullable: false })
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

        if (!!this.refCurrency !== (!!this.amount)) 
        { 
            const error = new ValidationError();
            error.target = this;
            error.constraints = { "AmountAndRefCurrency": `Amount and refCurrency must be defined along with each other if one of them is defined.` }
            throw error;
        }       

        // Ensure only 1 base currency is for each user.
        if (this.isBase && await CurrencyRepository.getInstance().count({where: { owner: { id: this.owner.id }, isBase: true }}) >= 1)
        {
            const error = new ValidationError();
            error.target = this;
            error.constraints = { "RepeatedBaseCurrency": `Each user should have only 1 base currency.` }
            throw error;
        }
    }
}