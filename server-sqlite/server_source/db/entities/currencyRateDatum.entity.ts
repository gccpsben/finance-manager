import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, Check, Index, Relation } from "typeorm";

import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { BigIntNumberTransformer, EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey, IsDecimalJSString, IsUTCDateInt } from "../validators.ts";
import { Currency } from "./currency.entity.ts";
import { nameof } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

@Entity()
@Unique("UniqueRateDateWithinUser", ["date", "owner", "refCurrencyId"])
@Check(/*sql*/`"refCurrencyId" <> "refAmountCurrencyId"`) // This datum may not use itself as the unit of rate.
export class CurrencyRateDatum extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: UUID | null;

    @Column({ nullable: false, type: "varchar", name: 'amount' })
    @IsDecimalJSString()
    amount!: string;

    @Column( { nullable: false, type: "varchar", name: 'refCurrencyId' })
    @Index()
    refCurrencyId!: UUID;

    @ManyToOne(_type => Currency)
    @JoinColumn({ name: "refCurrency" })
    @EnsureNotPlainForeignKey()
    refCurrency!: Relation<Currency> | null;

    @Column( { nullable: false, type: "varchar", name: 'refAmountCurrencyId' })
    @Index()
    refAmountCurrencyId!: UUID;

    @ManyToOne(_type => Currency)
    @JoinColumn({ name: "refAmountCurrency" })
    @EnsureNotPlainForeignKey()
    refAmountCurrency!: Relation<Currency> | null;

    @Column( { nullable: false, type: "varchar", name: 'ownerId' })
    @Index()
    ownerId!: UUID;

    @ManyToOne(_type => User, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    @Column({ type: "int8", nullable: false, name: 'date', transformer: BigIntNumberTransformer })
    @IsUTCDateInt()
    @Index()
    date!: number;
}

export const keyNameOfCurrencyRateDatum = (k: keyof CurrencyRateDatum) => `${nameof<CurrencyRateDatum>(k)}`;