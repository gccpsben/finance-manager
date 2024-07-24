import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate } from "typeorm";
import "reflect-metadata"
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { IsDate, validate } from "class-validator";
import { EntityClass } from "../dbEntityNase.js";

@Entity()
export class AccessToken extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    @IsDate()
    creationDate: Date;

    @ManyToOne(type => User, user => user.accessTokens, { nullable: false })
    owner: User;
}