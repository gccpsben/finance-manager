import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, OneToOne, ManyToOne, JoinColumn, Check, Index } from "typeorm";
import "reflect-metadata"
import { IsDate, IsNotEmpty, IsOptional, IsString, MaxLength, validate } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { Currency } from "./currency.entity.js";
import { Container } from "./container.entity.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.js";
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
    "Either one of (or both) [toAmount, fromAmount] should be defined.",
    /*sql*/`toAmount IS NOT NULL OR fromAmount IS NOT NULL`
)
export class Transaction extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ nullable: false })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    @Index({fulltext: true})
    title: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString() 
    @MaxLength(5128)
    @Index({fulltext: true})
    description: string | undefined;

    @ManyToOne(type => User, user => user.transactions, { nullable: false })
    @JoinColumn({ name: "ownerId" })
    @EnsureNotPlainForeignKey()  
    owner: User;

    @Column({ nullable: false })
    @IsDate()
    creationDate: Date;

    @Column( { nullable: true } )
    txnTypeId: string;

    @JoinColumn({ name: "typeId" })
    @ManyToOne(type => TransactionType, { nullable: false })
    @EnsureNotPlainForeignKey()
    txnType: TransactionType;

    // #region From
    @Column( { nullable: true } )
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    fromAmount: string | undefined;

    @Column({nullable: true})
    fromCurrencyId: string;

    @JoinColumn({ name: "fromCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Currency, { nullable: true })
    fromCurrency: Currency | undefined;

    @Column({nullable: true})
    fromContainerId: string;

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

    @Column({nullable: true})
    toCurrencyId: string;

    @JoinColumn({ name: "toCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Currency, { nullable: true })
    toCurrency: Currency | undefined;

    @Column({nullable: true})
    toContainerId: string;

    @JoinColumn({ name: "toContainerId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Container, { nullable: true })
    toContainer: Container | undefined;
    // #endregion

    @BeforeInsert()
    @BeforeUpdate()
    public async validate()
    {
        await super.validate();
    }
}