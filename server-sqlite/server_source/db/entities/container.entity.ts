import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from "typeorm";
import { EntityClass } from "../dbEntityBase.ts";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { User } from "./user.entity.ts";
import { EnsureNotPlainForeignKey, IsUTCDateInt } from "../validators.ts";

@Entity()
@Unique("UniqueContainerNameWithinUser",["name", "owner"]) // For each user, no containers with the same name is allowed
export class Container extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: string | null;

    @Column({ nullable: false, unique: false, type: "varchar" })
    @MaxLength(256)
    @IsNotEmpty()
    @IsString()
    name!: string;

    @Column({ type: "int", nullable: false })
    @IsUTCDateInt()
    creationDate!: number;

    @Column( { nullable: false, type: "varchar" })
    ownerId!: string;

    @ManyToOne(_type => User, user => user.containers, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;
}