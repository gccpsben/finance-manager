import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, PrimaryColumn } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { IsDate, validate } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey } from "../validators.js";

@Entity()
export class AccessToken extends EntityClass
{
    @PrimaryColumn({nullable: false})
    token: string;

    @Column({nullable:false})
    @IsDate()
    creationDate: Date;

    @Column({nullable:false})
    @IsDate()
    expiryDate: Date;

    @ManyToOne(type => User, user => user.accessTokens, { nullable: false })
    @EnsureNotPlainForeignKey() 
    owner: User;
}