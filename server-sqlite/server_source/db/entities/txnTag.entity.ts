import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation } from "typeorm";
import "reflect-metadata"
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey } from "../validators.js";
import { User } from "./user.entity.js";
import { nameof } from "../servicesUtils.js";

@Entity()
export class TxnTag extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: false, nullable: false })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    name: string;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.tags)
    @EnsureNotPlainForeignKey()
    owner: Relation<User> | null;
}

export const nameofTT = (x: keyof TxnTag) => nameof<TxnTag>(x);