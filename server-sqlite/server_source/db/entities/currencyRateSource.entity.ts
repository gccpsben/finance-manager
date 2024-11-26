import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Relation } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey } from "../validators.js";
import { Currency } from "./currency.entity.js";
import { OwnedEntity } from "../ownedEntity.js";

export const CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME = "currency_rate_source";
@Entity({ name: CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME })
export class CurrencyRateSource extends EntityClass implements OwnedEntity
{
    @PrimaryGeneratedColumn('uuid')
    id: string | null;

    @Column( { nullable: false })
    refCurrencyId: string;

    @ManyToOne(type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refCurrency: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false })
    refAmountCurrencyId: string;

    @ManyToOne(type => Currency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refAmountCurrency: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner: Relation<User> | null;

    @Column( { nullable: false } )
    hostname: string;

    @Column( { nullable: false } )
    path: string;

    @Column( { nullable: false } )
    jsonQueryString: string;

    @Column( { nullable: false } )
    name: string;

    @Column({ nullable: true, type: Number })
    lastExecuteTime: number | null;
}