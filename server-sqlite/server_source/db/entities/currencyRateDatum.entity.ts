import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, Check, Index, Relation } from "typeorm";
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

    @ManyToOne(type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refCurrency: Relation<Currency>;

    @Column( { nullable: false })
    @Index()
    refAmountCurrencyId: string;

    @ManyToOne(type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refAmountCurrency: Relation<Currency>;

    @Column( { nullable: false })
    @Index()
    ownerId: string;

    @ManyToOne(type => User, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner: Relation<User>;

    @Column({ type: "int", nullable: false })
    @IsUTCDateInt()
    @Index()
    date: number;
}