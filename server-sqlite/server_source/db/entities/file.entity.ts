import { Entity, Column, Relation, PrimaryGeneratedColumn } from "typeorm";

import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey } from "../validators.ts";
import { nameof } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

@Entity()
export class File extends EntityClass
{
    @PrimaryGeneratedColumn('uuid')
    id!: UUID;

    @Column( { nullable: false, type: "varchar", name: 'ownerId' })
    ownerId!: UUID;

    @ManyToOne(_type => User, { nullable: false })
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    /** A user-defined file name. Notice that this will not be reflected in the file system. */
    @Column( { nullable: false, type: "varchar", name: 'fileNameReadable' })
    fileNameReadable!: string;
}

export const keyNameOfFile = (x: keyof File) => `"${nameof(x)}`;