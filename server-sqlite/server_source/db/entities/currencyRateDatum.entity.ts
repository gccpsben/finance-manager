import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, PrimaryColumn, OneToOne, JoinColumn, Check, Unique, Index, AfterLoad, EntitySubscriberInterface, EventSubscriber, InsertEvent } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { IsBoolean, IsDate, IsNotEmpty, isNumber, IsObject, IsOptional, IsString, MaxLength, validate, ValidationError } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.js";
import { Currency } from "./currency.entity.js";

@Entity() 
@Unique("UniqueRateDateWithinUser",["date", "owner"])
export class CurrencyRateDatum extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: false }) 
    @IsDecimalJSString()
    amount: string;

    @ManyToOne(type => Currency, currency => currency.refCurrency, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey() 
    refCurrency: Currency;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.currencies, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey() 
    owner: User;

    @Column({ nullable: false })
    @IsDate()
    date: Date;
}