import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, JoinColumn, Check, Unique, Relation, OneToMany } from "typeorm";
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.ts";
import { CurrencyRateSource } from "./currencyRateSource.entity.ts";
import { nameof } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

@Entity()
@Unique("UniqueCurrencyNameWithinUser",["name", "owner"]) // For each user, no currencies with the same name is allowed
@Unique("UniqueCurrencyTickerWithinUser",["ticker", "owner"]) // For each user, no currencies with the same ticker is allowed
@Check(/*sql*/`CASE WHEN "fallbackRateAmount" IS NOT NULL THEN NOT "isBase" ELSE "isBase" END`) // If isBase then fallbackRateAmount must be null.
@Check(/*sql*/`CASE WHEN NOT "isBase" THEN "fallbackRateAmount" IS NOT NULL ELSE "fallbackRateAmount" IS NULL END`) // If not isBase then fallbackRateAmount must also not be null.
@Check(/*sql*/`CASE WHEN NOT "isBase" THEN "fallbackRateCurrencyId" IS NOT NULL ELSE "fallbackRateCurrencyId" IS NULL END`) // If not isBase then refCurrency must also not be null
export class Currency extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: UUID | null;

    @Column({nullable: false, type: "varchar", name: 'name'})
    @IsNotEmpty()
    @IsString()
    @MaxLength(128)
    name!: string;

    @Column({nullable: true, type: "varchar", name: 'fallbackRateAmount'})
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    fallbackRateAmount?: string | null;

    @Column( { nullable: true, type: "varchar", name: 'fallbackRateCurrencyId' })
    fallbackRateCurrencyId?: UUID | null;

    @ManyToOne(_type => Currency, currency => currency.fallbackRateCurrency, { nullable: true })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    fallbackRateCurrency!: Omit<Omit<Relation<Currency>, 'owner'>, 'refCurrency'> | null;

    @Column( { nullable: false, type: "varchar", name: "ownerId" })
    ownerId!: UUID;

    @ManyToOne(_type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    @OneToMany(_type => CurrencyRateSource, currencyRateSource => currencyRateSource.refCurrency)
    @EnsureNotPlainForeignKey()
    currenciesRateSources!: CurrencyRateSource[];

    @Column({ type: 'boolean', name:"isBase" })
    @IsBoolean()
    @IsNotEmpty()
    isBase!: boolean;

    @Column({ type: "varchar", name: 'ticker' })
    @IsNotEmpty()
    ticker!: string;

    @Column({ nullable: true, type: 'int', name: 'lastRateCronUpdateTime' })
    lastRateCronUpdateTime?: number | null;

    @BeforeInsert()
    @BeforeUpdate()
    public override async validate() { await super.validate(); }
}

export const keyNameOfCurrency = (x: keyof Currency) => `${nameof<Currency>(x)}`;