import { Entity, Column, PrimaryColumn, Relation } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey, IsUTCDateInt } from "../validators.js";

@Entity()
export class AccessToken extends EntityClass
{
    @PrimaryColumn({nullable: false})
    token: string;

    @Column({type: "int", nullable:false})
    @IsUTCDateInt()
    creationDate: number;

    @Column({type: "int", nullable:false})
    @IsUTCDateInt()
    expiryDate: number;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.accessTokens, { nullable: false })
    @EnsureNotPlainForeignKey()
    owner: Relation<User> | null;
}