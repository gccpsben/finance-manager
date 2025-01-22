import { Entity, Column, PrimaryColumn, Relation } from "typeorm";
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey, IsUTCDateInt } from "../validators.ts";

@Entity()
export class AccessToken extends EntityClass
{
    @PrimaryColumn({nullable: false, type: "varchar"})
    tokenHashed!: string;

    @Column({type: 'int', nullable:false})
    @IsUTCDateInt()
    creationDate!: number;

    @Column({type: "int", nullable:false})
    @IsUTCDateInt()
    expiryDate!: number;

    @Column( { nullable: false, type: "varchar" })
    ownerId!: string;

    @ManyToOne(_type => User, user => user.accessTokens, { nullable: false })
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;
}