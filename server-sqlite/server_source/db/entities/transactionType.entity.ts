import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, OneToOne, ManyToOne } from "typeorm";
import "reflect-metadata"
import { IsNotEmpty, IsString, MaxLength, validate } from "class-validator";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey } from "../validators.js";
import { User } from "./user.entity.js";

@Entity()
export class TransactionType extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: false, nullable: false })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    name: string;

    @ManyToOne(type => User, user => user.transactionTypes)
    @EnsureNotPlainForeignKey() 
    owner: User;
}