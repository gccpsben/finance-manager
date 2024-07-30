import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, OneToOne, ManyToOne, JoinColumn, Check } from "typeorm";
import "reflect-metadata"
import { OneToMany } from "typeorm";
import { AccessToken } from "./accessToken.entity.js";
import { IsDate, IsNotEmpty, IsOptional, IsString, MaxLength, validate } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { Currency } from "./currency.entity.js";
import { Container } from "./container.entity.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.js";
import { User } from "./user.entity.js";

@Entity() 
@Check // [fromAmount, fromCurrencyId, fromContainerId] must either be all defined, or not defined
(
    /*sql*/`
    CASE WHEN fromAmount IS NOT NULL 
        THEN (fromCurrencyId IS NOT NULL) AND (fromContainerId IS NOT NULL)
        ELSE (fromCurrencyId IS NULL) AND (fromContainerId IS NULL)
    END`
)
@Check // [toAmount, toCurrencyId, toContainerId] must either be all defined, or not defined
(
    /*sql*/`
    CASE WHEN toAmount IS NOT NULL 
        THEN toCurrencyId IS NOT NULL AND toContainerId IS NOT NULL
        ELSE toCurrencyId IS NULL AND toContainerId IS NULL
    END`
)
@Check(/*sql*/`toAmount IS NOT NULL OR fromAmount IS NOT NULL`) // Either one of (or both) [toAmount, fromAmount] should be defined.
export class Transaction extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ nullable: false })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    title: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString() 
    @MaxLength(5128)
    description: string | undefined;

    @ManyToOne(type => User, user => user.transactions, { nullable: false })
    @JoinColumn({ name: "ownerId" })
    @EnsureNotPlainForeignKey()  
    owner: User;

    @Column({ nullable: false })
    @IsDate()
    creationDate: Date;

    // #region From
    @Column( { nullable: true } )
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    fromAmount: string | undefined;

    @JoinColumn({ name: "fromCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Currency, { nullable: true })
    fromCurrency: Currency | undefined;

    @JoinColumn({ name: "fromContainerId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Container, { nullable: true })
    fromContainer: Container | undefined;
    // #endregion

    // #region To
    @Column( { nullable: true } )
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    toAmount: string | undefined;

    @JoinColumn({ name: "toCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Currency, { nullable: true })
    toCurrency: Currency | undefined;

    @JoinColumn({ name: "toContainerId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Container, { nullable: true })
    toContainer: Container | undefined;
    // #endregion
}