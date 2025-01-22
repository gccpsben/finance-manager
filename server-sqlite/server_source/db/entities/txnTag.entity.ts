import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation } from "typeorm";

import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey } from "../validators.ts";
import { User } from "./user.entity.ts";
import { nameof } from "../servicesUtils.ts";

@Entity()
export class TxnTag extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: false, nullable: false, type: "varchar" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    name!: string;

    @Column( { nullable: false, type: "varchar" })
    ownerId!: string;

    @ManyToOne(_type => User, user => user.tags)
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;
}

export const nameofTT = (x: keyof TxnTag) => nameof<TxnTag>(x);