import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, OneToOne } from "typeorm";
import "reflect-metadata"
import { OneToMany } from "typeorm";
import { AccessToken } from "./accessToken.entity.js";
import { IsNotEmpty, IsString, MaxLength, validate } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { Currency } from "./currency.entity.js";
import { Container } from "./container.entity.js";
import { EnsureNotPlainForeignKey } from "../validators.js";
import { Transaction } from "./transaction.entity.js";
import { TransactionType } from "./transactionType.entity.js";

@Entity() 
export class User extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true, nullable: false })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    username: string;

    @Column({nullable: false, select: false})
    @IsString() 
    @IsNotEmpty()
    @MaxLength(256)
    passwordHash: string;

    @OneToMany(type => AccessToken, accessToken => accessToken.owner)
    @EnsureNotPlainForeignKey() 
    accessTokens: AccessToken[];

    @OneToMany(type => Currency, currency => currency.owner)
    @EnsureNotPlainForeignKey() 
    currencies: Currency[];

    @OneToMany(type => Container, container => container.owner)
    @EnsureNotPlainForeignKey() 
    containers: Container[];

    @OneToMany(type => Transaction, transaction => transaction.owner)
    @EnsureNotPlainForeignKey() 
    transactions: Transaction[];

    @OneToMany(type => TransactionType, transactionType => transactionType.owner)
    @EnsureNotPlainForeignKey() 
    transactionTypes: TransactionType[];
}