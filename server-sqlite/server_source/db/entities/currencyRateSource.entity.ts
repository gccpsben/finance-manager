import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Relation } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey } from "../validators.js";
import { Currency } from "./currency.entity.js";
import { OwnedEntity, UniqueIDEntity } from "../ownedEntity.js";

export const CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME = "currency_rate_source";
@Entity({ name: CURRENCY_RATE_SOURCE_ENTITY_TABLE_NAME })
// a993edb8-fa70-46b0-9ad1-85b3e3f619f1	def26450-3f05-439b-ba57-57652797fb47	0be22125-b17f-4052-a7b5-2207f6e723d3	litecoin.hkd	https://api.coingecko.com	/api/v3/simple/price?ids=litecoin&vs_currencies=hkd	0c25f1e5-e6c2-4078-acb0-8b1bc5669015	1731907864259	CGK
// 1896891b-f30c-4fe7-bdef-94b0d4ec9ebe	def26450-3f05-439b-ba57-57652797fb47	0be22125-b17f-4052-a7b5-2207f6e723d3	litecoin.hkd	https://api.coingecko.com	/api/v3/simple/price?ids=litecoin&vs_currencies=hkd	0c25f1e5-e6c2-4078-acb0-8b1bc5669015	1731824096450	CGK2
// d023094c-2f80-47d2-b597-6bb0a3a32826	def26450-3f05-439b-ba57-57652797fb47	0be22125-b17f-4052-a7b5-2207f6e723d3	litecoin.hkd	https://api.coingecko.com	/api/v3/simple/price?ids=litecoin&vs_currencies=hkd	0c25f1e5-e6c2-4078-acb0-8b1bc5669015	1731918671710	srcAddedViaPOST
// 0799fdd0-da3a-4bc8-90e6-8157e34f99dd	def26450-3f05-439b-ba57-57652797fb47	0be22125-b17f-4052-a7b5-2207f6e723d3	litecoin.hkd	https://api.coingecko.com	/api/v3/simple/price?ids=litecoin&vs_currencies=hkd	0c25f1e5-e6c2-4078-acb0-8b1bc5669015		srcAddedViaPOST
export class CurrencyRateSource extends EntityClass implements OwnedEntity, UniqueIDEntity
{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column( { nullable: true })
    refCurrencyId: string;

    @ManyToOne(type => Currency, { nullable: true })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refCurrency: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: true })
    refAmountCurrencyId: string;

    @ManyToOne(type => Currency, { nullable: true })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    refAmountCurrency: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner: Relation<User>;

    @Column( { nullable: false } )
    hostname: string;

    @Column( { nullable: false } )
    path: string;

    @Column( { nullable: false } )
    jsonQueryString: string;

    @Column( { nullable: false } )
    name: string;

    @Column({ nullable: true })
    lastExecuteTime?: number;
}