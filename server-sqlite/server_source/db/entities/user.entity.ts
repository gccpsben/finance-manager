import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

import { OneToMany } from "typeorm";
import { AccessToken } from "./accessToken.entity.ts";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.ts";
import { Currency } from "./currency.entity.ts";
import { Container } from "./container.entity.ts";
import { EnsureNotPlainForeignKey } from "../validators.ts";
import { Transaction } from "./transaction.entity.ts";
import { TxnTag } from "./txnTag.entity.ts";
import { CurrencyRateSource } from "./currencyRateSource.entity.ts";
import { nameof } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

@Entity()
export class User extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: UUID;

    @Column({ unique: true, nullable: false, type: "varchar", name: 'username' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    username!: string;

    @Column({nullable: false, select: false, type: "varchar", name: 'passwordHash'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    passwordHash!: string;

    @OneToMany(_type => AccessToken, accessToken => accessToken.owner)
    @EnsureNotPlainForeignKey()
    accessTokens!: AccessToken[] | null;

    @OneToMany(_type => Currency, currency => currency.owner)
    @EnsureNotPlainForeignKey()
    currencies!: Currency[] | null;

    @OneToMany(_type => CurrencyRateSource, currencyRateSource => currencyRateSource.owner)
    @EnsureNotPlainForeignKey()
    currenciesRateSources!: CurrencyRateSource[] | null;

    @OneToMany(_type => Container, container => container.owner)
    @EnsureNotPlainForeignKey()
    containers!: Container[] | null;

    @OneToMany(_type => Transaction, transaction => transaction.owner)
    @EnsureNotPlainForeignKey()
    transactions!: Transaction[] | null;

    @OneToMany(_type => TxnTag, tag => tag.owner)
    @EnsureNotPlainForeignKey()
    tags!: TxnTag[] | null;
}

export const keyNameOfUser = (x: keyof User) => `${nameof<User>(x)}`;