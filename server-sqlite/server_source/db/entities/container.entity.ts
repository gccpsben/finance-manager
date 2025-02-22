import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from "typeorm";
import { BigIntNumberTransformer, EntityClass } from "../dbEntityBase.ts";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { User } from "./user.entity.ts";
import { EnsureNotPlainForeignKey, IsUTCDateInt } from "../validators.ts";
import { nameof } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

@Entity()
@Unique("UniqueContainerNameWithinUser",["name", "owner"]) // For each user, no containers with the same name is allowed
export class Container extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: UUID | null;

    @Column({ nullable: false, unique: false, type: "varchar", name: 'name' })
    @MaxLength(256)
    @IsNotEmpty()
    @IsString()
    name!: string;

    @Column({ type: "int8", nullable: false, name: 'creationDate', transformer: BigIntNumberTransformer })
    @IsUTCDateInt()
    creationDate!: number;

    @Column( { nullable: false, type: "varchar", name: 'ownerId' })
    ownerId!: UUID;

    @ManyToOne(_type => User, user => user.containers, { nullable: false })
    @JoinColumn()
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;
}

export const keyNameOfContainer = (x: keyof Container) => `${nameof<Container>(x)}`;