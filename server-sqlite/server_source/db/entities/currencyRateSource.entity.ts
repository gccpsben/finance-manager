import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Relation } from "typeorm";

import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { BigIntNumberTransformer, EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey } from "../validators.ts";
import { Currency } from "./currency.entity.ts";
import { nameof } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

export const CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME = "currency_rate_source";
@Entity({ name: CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME })
export class CurrencyRateSource extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: UUID | null;

    @Column( { nullable: false, type: "varchar", name: 'refCurrencyId' })
    refCurrencyId!: UUID;

    @ManyToOne(_type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refCurrency!: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false, type: "varchar", name: 'refAmountCurrencyId' })
    refAmountCurrencyId!: UUID;

    @ManyToOne(_type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refAmountCurrency!: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false, type: "varchar", name: 'ownerId' })
    ownerId!: UUID;

    @ManyToOne(_type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    @Column( { nullable: false, type: "varchar", name: 'hostname' } )
    hostname!: string;

    @Column( { nullable: false, type: "varchar", name: 'path' } )
    path!: string;

    @Column( { nullable: false, type: "varchar", name: 'jsonQueryName' } )
    jsonQueryString!: string;

    @Column( { nullable: false, type: "varchar", name: 'name' } )
    name!: string;

    @Column({ nullable: true, type: 'int8', name: 'lastExecutionTime', transformer: BigIntNumberTransformer })
    lastExecuteTime!: number | null;
}

export const keyNameOfCurrencyRateSource = (x: keyof CurrencyRateSource) => `${nameof(x)}`;