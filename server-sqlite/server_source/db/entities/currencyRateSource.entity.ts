import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Relation } from "typeorm";

import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey } from "../validators.ts";
import { Currency } from "./currency.entity.ts";

export const CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME = "currency_rate_source";
@Entity({ name: CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME })
export class CurrencyRateSource extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: string | null;

    @Column( { nullable: false, type: "varchar" })
    refCurrencyId!: string;

    @ManyToOne(_type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refCurrency!: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false, type: "varchar" })
    refAmountCurrencyId!: string;

    @ManyToOne(_type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refAmountCurrency!: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false, type: "varchar" })
    ownerId!: string;

    @ManyToOne(_type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    @Column( { nullable: false, type: "varchar" } )
    hostname!: string;

    @Column( { nullable: false, type: "varchar" } )
    path!: string;

    @Column( { nullable: false, type: "varchar" } )
    jsonQueryString!: string;

    @Column( { nullable: false, type: "varchar" } )
    name!: string;

    @Column({ nullable: true, type: 'int' })
    lastExecuteTime!: number | null;
}