import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, JoinColumn, Check, Unique, Relation, OneToMany } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { CurrencyRateSource } from "./currencyRateSource.entity.js";

@Entity()
@Unique("UniqueCurrencyNameWithinUser",["name", "owner"]) // For each user, no currencies with the same name is allowed
@Unique("UniqueCurrencyTickerWithinUser",["ticker", "owner"]) // For each user, no currencies with the same ticker is allowed
@Check(/*sql*/`CASE WHEN fallbackRateAmount IS NOT NULL THEN NOT isBase ELSE isBase END`) // If isBase then fallbackRateAmount must be null.
@Check(/*sql*/`CASE WHEN NOT isBase THEN fallbackRateAmount IS NOT NULL ELSE fallbackRateAmount IS NULL END`) // If not isBase then fallbackRateAmount must also not be null.
@Check(/*sql*/`CASE WHEN NOT isBase THEN fallbackRateCurrencyId IS NOT NULL ELSE fallbackRateCurrencyId IS NULL END`) // If not isBase then refCurrency must also not be null
export class Currency extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id: string | null;

    @Column({nullable: false})
    @IsNotEmpty()
    @IsString()
    @MaxLength(128)
    name: string;

    @Column({nullable: true, type: String})
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    fallbackRateAmount?: string | null;

    @Column( { nullable: true, type: String })
    fallbackRateCurrencyId?: string | null;

    @ManyToOne(type => Currency, currency => currency.fallbackRateCurrency, { nullable: true })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    fallbackRateCurrency: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner: Relation<User> | null;

    @OneToMany(type => CurrencyRateSource, currencyRateSource => currencyRateSource.refCurrency)
    @EnsureNotPlainForeignKey()
    currenciesRateSources: CurrencyRateSource[];

    @Column()
    @IsBoolean()
    @IsNotEmpty()
    isBase: boolean;

    @Column()
    @IsNotEmpty()
    ticker: string;

    @Column({ nullable: true, type: Number })
    lastRateCronUpdateTime?: number | null;

    @BeforeInsert()
    @BeforeUpdate()
    public override async validate() { await super.validate(); }
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