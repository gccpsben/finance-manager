import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn, Check, Index, Relation } from "typeorm";
import "reflect-metadata"
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { Currency } from "./currency.entity.js";
import { Container } from "./container.entity.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString, IsUTCDateInt } from "../validators.js";
import { User } from "./user.entity.js";
import { TransactionType } from "./transactionType.entity.js";

@Entity()
@Check
(
    "[fromAmount, fromCurrencyId, fromContainerId] must either be all defined, or not defined",
    /*sql*/`
    CASE WHEN fromAmount IS NOT NULL
        THEN (fromCurrencyId IS NOT NULL) AND (fromContainerId IS NOT NULL)
        ELSE (fromCurrencyId IS NULL) AND (fromContainerId IS NULL)
    END`
)
@Check
(
    "[toAmount, toCurrencyId, toContainerId] must either be all defined, or not defined",
    /*sql*/`
    CASE WHEN toAmount IS NOT NULL
        THEN toCurrencyId IS NOT NULL AND toContainerId IS NOT NULL
        ELSE toCurrencyId IS NULL AND toContainerId IS NULL
    END`
)
@Check
(
    // For some reasons, using "(toAmount IS NOT NULL) OR (fromAmount IS NOT NULL)" will cause overflow if the
    // db is saved too many times. Have to use CASE to tame the TypeORM sync
    "[fromAmount] must be defined if [toAmount] is not defined.",
    /*sql*/`
    CASE WHEN toAmount IS NULL
        THEN fromAmount IS NOT NULL
    END`
)
@Check
(
    // For some reasons, using "(toAmount IS NOT NULL) OR (fromAmount IS NOT NULL)" will cause overflow if the
    // db is saved too many times. Have to use CASE to tame the TypeORM sync
    "[toAmount] must be defined if [fromAmount] is not defined.",
    /*sql*/`
    CASE WHEN fromAmount IS NULL
        THEN toAmount IS NOT NULL
    END`
)
export class Transaction extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string | null;

    @Column({ nullable: false })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    @Index({fulltext: true})
    title: string;

    @Column({ nullable: true, type: String })
    @IsOptional()
    @IsString()
    @MaxLength(5128)
    @Index({fulltext: true})
    description: string | null;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.transactions, { nullable: false })
    @JoinColumn({ name: "ownerId" })
    @EnsureNotPlainForeignKey()
    owner: Relation<User> | null;

    @Column({ type: "int", nullable: false })
    @IsUTCDateInt()
    creationDate: number;

    @Column( { nullable: false } )
    txnTypeId: string;

    @ManyToOne(type => TransactionType, { nullable: false })
    @JoinColumn({ name: "txnTypeId" })
    @EnsureNotPlainForeignKey()
    txnType: Relation<TransactionType> | null;

    // #region From
    @Column( { nullable: true, type: String } )
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    fromAmount: string | null;

    @Column({nullable: true, type: String})
    fromCurrencyId: string | null;

    @JoinColumn({ name: "fromCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Currency, { nullable: true })
    fromCurrency: Relation<Currency> | null;

    @Column({nullable: true})
    fromContainerId: string | null;

    @JoinColumn({ name: "fromContainerId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Container, { nullable: true })
    fromContainer: Relation<Container> | null;
    // #endregion

    // #region To
    @Column( { nullable: true, type: String } )
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    toAmount: string | null;

    @Column({nullable: true})
    toCurrencyId: string | null;

    @JoinColumn({ name: "toCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Currency, { nullable: true })
    toCurrency: Relation<Currency> | null;

    @Column({nullable: true})
    toContainerId: string | null;

    @JoinColumn({ name: "toContainerId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Container, { nullable: true })
    toContainer: Relation<Container> | null;
    // #endregion

    @BeforeInsert()
    @BeforeUpdate()
    public async validate()
    {
        await super.validate();
    }
}