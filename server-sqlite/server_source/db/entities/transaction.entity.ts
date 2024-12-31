import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn, Check, Index, Relation, ManyToMany, JoinTable, OneToMany } from "typeorm";
import "reflect-metadata"
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { Currency } from "./currency.entity.js";
import { Container } from "./container.entity.js";
import { EnsureNotPlainForeignKey, IsDecimalJSString, IsUTCDateInt } from "../validators.js";
import { User } from "./user.entity.js";
import { TxnTag } from "./txnTag.entity.js";
import { Fragment } from "./fragment.entity.js";

@Entity()
/**
 * Represent the raw entity of a `Transaction` stored inside database.
 * This type should RARELY be used in the application.
 */
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

    @ManyToMany((type) => TxnTag, { cascade: true })
    @JoinTable()
    @EnsureNotPlainForeignKey()
    tags: TxnTag[] | string[] | null;

    @OneToMany(() => Fragment, (fragment) => fragment.parentTxn)
    fragments: Fragment[];

    @BeforeInsert()
    @BeforeUpdate()
    public override async validate()
    {
        await super.validate();
    }
}