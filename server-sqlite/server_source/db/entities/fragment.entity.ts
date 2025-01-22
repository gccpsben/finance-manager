import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation, JoinColumn, Check } from "typeorm";

import { IsOptional, IsString } from "class-validator";
import { EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey, IsDecimalJSString } from "../validators.ts";
import { User } from "./user.entity.ts";
import { Currency } from "./currency.entity.ts";
import { Container } from "./container.entity.ts";
import { Transaction } from "./transaction.entity.ts";
import { nameof } from "../servicesUtils.ts";

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
    id!: string;

    @Column({nullable: false, type: "varchar"})
    parentTxnId!: string;

    @JoinColumn({ name: "parentTxnId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(_type => Transaction, { nullable: false })
    parentTxn!: Relation<Transaction>;

    // #region From
    @Column( { nullable: true, type: "varchar" } )
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    fromAmount!: string | null;

    @Column({nullable: true, type: "varchar"})
    fromCurrencyId!: string | null;

    @JoinColumn({ name: "fromCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(_type => Currency, { nullable: true })
    fromCurrency!: Relation<Currency> | null;

    @Column({nullable: true, type: "varchar"})
    fromContainerId!: string | null;

    @JoinColumn({ name: "fromContainerId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(_type => Container, { nullable: true })
    fromContainer!: Relation<Container> | null;
    // #endregion

    // #region To
    @Column( { nullable: true, type: "varchar" } )
    @IsOptional()
    @IsString()
    @IsDecimalJSString()
    toAmount!: string | null;

    @Column({nullable: true, type: "varchar"})
    toCurrencyId!: string | null;

    @JoinColumn({ name: "toCurrencyId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(_type => Currency, { nullable: true })
    toCurrency!: Relation<Currency> | null;

    @Column({nullable: true, type: "varchar"})
    toContainerId!: string | null;

    @JoinColumn({ name: "toContainerId" })
    @EnsureNotPlainForeignKey()
    @ManyToOne(_type => Container, { nullable: true })
    toContainer!: Relation<Container> | null;
    // #endregion

    @Column( { nullable: false, type: "varchar" })
    ownerId!: string;

    @ManyToOne(_type => User, user => user.tags)
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;
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