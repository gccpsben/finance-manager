import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, Check } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString, IsUTCDateInt } from "../validators.js";
import { Currency } from "./currency.entity.js";

@Entity() 
@Unique("UniqueRateDateWithinUser", ["date", "owner", "refCurrency"])
@Check(/*sql*/`refCurrencyId is NOT refAmountCurrencyId`) // This datum may not use itself as the unit of rate.
export class CurrencyRateDatum extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: false }) 
    @IsDecimalJSString()
    amount: string;

    @Column( { nullable: false })
    refCurrencyId: string;

    @ManyToOne(type => Currency, currency => currency.refCurrency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey() 
    refCurrency: Currency;

    @Column( { nullable: false })
    refAmountCurrencyId: string;

    @ManyToOne(type => Currency, currency => currency.refCurrency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey() 
    refAmountCurrency: Currency;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey() 
    owner: User;

    @Column({ type: "int", nullable: false })
    @IsUTCDateInt()
    date: number;
}