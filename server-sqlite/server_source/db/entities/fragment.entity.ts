import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation, JoinColumn, Check } from "typeorm";
import "reflect-metadata"
import { IsOptional, IsString } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.js";
import { User } from "./user.entity.js";
import { Currency } from "./currency.entity.js";
import { Container } from "./container.entity.js";
import { Transaction } from "./transaction.entity.js";
import { nameof } from "../servicesUtils.js";

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
export class Fragment extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({nullable: false})
    parentTxnId: string;

    @JoinColumn({ name: "parentTxnId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(type => Transaction, { nullable: false })
    parentTxn: Relation<Transaction>;

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

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.tags)
    @EnsureNotPlainForeignKey()
    owner: Relation<User> | null;
}

export type FragmentRaw =
{
    fromAmount: string | null,
    fromContainerId: string | null,
    fromCurrencyId: string | null,
    toAmount: string | null,
    toContainerId: string | null,
    toCurrencyId: string | null,
};

export const nameofF = (x: keyof Fragment) => nameof<Fragment>(x);