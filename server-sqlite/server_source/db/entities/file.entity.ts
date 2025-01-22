import { Entity, Column, PrimaryColumn, Relation, PrimaryGeneratedColumn } from "typeorm";

import { ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { EntityClass } from "../dbEntityBase.js";
import { EnsureNotPlainForeignKey } from "../validators.js";

@Entity()
export class File extends EntityClass
{
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column( { nullable: false, type: "varchar" })
    ownerId!: string;

    @ManyToOne(type => User, { nullable: false })
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;

    /** A user-defined file name. Notice that this will not be reflected in the file system. */
    @Column( { nullable: false, type: "varchar" })
    fileNameReadable!: string;
}