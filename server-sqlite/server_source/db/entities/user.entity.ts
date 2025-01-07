import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import "reflect-metadata"
import { OneToMany } from "typeorm";
import { AccessToken } from "./accessToken.entity.js";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { Currency } from "./currency.entity.js";
import { Container } from "./container.entity.js";
import { EnsureNotPlainForeignKey } from "../validators.js";
import { Transaction } from "./transaction.entity.js";
import { TxnTag } from "./txnTag.entity.js";
import { CurrencyRateSource } from "./currencyRateSource.entity.js";

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
    accessTokens: AccessToken[] | null;

    @OneToMany(type => Currency, currency => currency.owner)
    @EnsureNotPlainForeignKey()
    currencies: Currency[] | null;

    @OneToMany(type => CurrencyRateSource, currencyRateSource => currencyRateSource.owner)
    @EnsureNotPlainForeignKey()
    currenciesRateSources: CurrencyRateSource[] | null;

    @OneToMany(type => Container, container => container.owner)
    @EnsureNotPlainForeignKey()
    containers: Container[] | null;

    @OneToMany(type => Transaction, transaction => transaction.owner)
    @EnsureNotPlainForeignKey()
    transactions: Transaction[] | null;

    @OneToMany(type => TxnTag, tag => tag.owner)
    @EnsureNotPlainForeignKey()
    tags: TxnTag[] | null;
}

export const nameofU = (x: keyof User) => x;