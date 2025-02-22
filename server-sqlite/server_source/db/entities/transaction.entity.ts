import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn, Index, Relation, ManyToMany, JoinTable, OneToMany } from "typeorm";

import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { BigIntNumberTransformer, EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey, IsUTCDateInt } from "../validators.ts";
import { User } from "./user.entity.ts";
import { TxnTag } from "./txnTag.entity.ts";
import { Fragment } from "./fragment.entity.ts";
import { nameof } from "../servicesUtils.ts";
import { File } from './file.entity.ts';
import { UUID } from "node:crypto";

@Entity()
/**
 * Represent the raw entity of a `Transaction` stored inside database.
 * This type should RARELY be used in the application.
 */
export class Transaction extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: UUID | null;

    @Column({ nullable: false, type: "varchar", name: 'title' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    @Index({fulltext : true})
    title!: string;

    @Column({ nullable: true, type: "varchar", name: 'description' })
    @IsOptional()
    @IsString()
    @MaxLength(5128)
    @Index({fulltext: true})
    description!: string | null;

    @Column( { nullable: false, type: "varchar", name: 'ownerId' })
    ownerId!: UUID;

    @ManyToOne(_type => User, user => user.transactions, { nullable: false })
    @JoinColumn({ name: "ownerId" })
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    @Column({ type: "int8", nullable: false, name: 'creationDate', transformer: BigIntNumberTransformer })
    @IsUTCDateInt()
    creationDate!: number;

    @ManyToMany((_type) => TxnTag, { cascade: true })
    @JoinTable()
    @EnsureNotPlainForeignKey()
    tags!: TxnTag[] | string[] | null;

    @OneToMany(() => Fragment, (fragment) => fragment.parentTxn)
    fragments!: Fragment[];

    @ManyToMany(() => File)
    @JoinTable()
    files!: File[];

    @Column({ nullable: false, type: 'boolean', name: 'excludedFromIncomesExpenses' })
    @IsNotEmpty()
    @IsBoolean()
    excludedFromIncomesExpenses!: boolean;

    @BeforeInsert()
    @BeforeUpdate()
    public override async validate()
    {
        await super.validate();
    }
}

export const keyNameOfTransaction = (x: keyof Transaction) => `${nameof<Transaction>(x)}`;