import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, Check, Index, Relation } from "typeorm";

import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey, IsDecimalJSString, IsUTCDateInt } from "../validators.ts";
import { Currency } from "./currency.entity.ts";

@Entity()
@Unique("UniqueRateDateWithinUser", ["date", "owner", "refCurrency"])
@Check(/*sql*/`refCurrencyId is NOT refAmountCurrencyId`) // This datum may not use itself as the unit of rate.
export class CurrencyRateDatum extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: string | null;

    @Column({ nullable: false, type: "varchar" })
    @IsDecimalJSString()
    amount!: string;

    @Column( { nullable: false, type: "varchar" })
    @Index()
    refCurrencyId!: string;

    @ManyToOne(_type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refCurrency!: Relation<Currency> | null;

    @Column( { nullable: false, type: "varchar" })
    @Index()
    refAmountCurrencyId!: string;

    @ManyToOne(_type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refAmountCurrency!: Relation<Currency> | null;

    @Column( { nullable: false, type: "varchar" })
    @Index()
    ownerId!: string;

    @ManyToOne(_type => User, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    @Column({ type: "int", nullable: false })
    @IsUTCDateInt()
    @Index()
    date!: number;
}

export const nameofCRD = (k: keyof CurrencyRateDatum) => k;