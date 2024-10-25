import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from "typeorm";
import { EntityClass } from "../dbEntityBase.js";
import { IsDate, IsNotEmpty, IsNumber, IsString, MaxLength } from "class-validator";
import { User } from "./user.entity.js";
import { EnsureNotPlainForeignKey, IsUTCDateInt } from "../validators.js";

@Entity()
@Unique("UniqueContainerNameWithinUser",["name", "owner"]) // For each user, no containers with the same name is allowed
export class Container extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: false, unique: false })
    @MaxLength(256)
    @IsNotEmpty()
    @IsString()
    name: string;

    @Column({ type: "int", nullable: false })
    @IsUTCDateInt()
    creationDate: number;

    @Column( { nullable: false })
    ownerId: string;

    @ManyToOne(type => User, user => user.containers, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner: Relation<User>;
}