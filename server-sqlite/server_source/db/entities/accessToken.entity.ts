import { Entity, Column, PrimaryColumn, Relation } from "typeorm";
import { ManyToOne } from "typeorm";
import { User } from "./user.entity.ts";
import { BigIntNumberTransformer, EntityClass } from "../dbEntityBase.ts";
import { EnsureNotPlainForeignKey, IsUTCDateInt } from "../validators.ts";
import { nameof } from "../servicesUtils.ts";
import { UUID } from "node:crypto";

@Entity()
export class AccessToken extends EntityClass
{
    @PrimaryColumn({nullable: false, type: "varchar"})
    tokenHashed!: string;

    @Column({ type: 'int8', nullable:false, name: 'creationDate', transformer: BigIntNumberTransformer })
    @IsUTCDateInt()
    creationDate!: number;

    @Column({type: "int8", nullable:false, name: 'expiryDate', transformer: BigIntNumberTransformer })
    @IsUTCDateInt()
    expiryDate!: number;

    @Column( { nullable: false, type: "varchar", name: 'ownerId' })
    ownerId!: UUID;

    @ManyToOne(_type => User, user => user.accessTokens, { nullable: false })
    @EnsureNotPlainForeignKey()
    owner!: Relation<User> | null;
}

export const keyNameOfAccessToken = (x: keyof AccessToken) => `${nameof<AccessToken>(x)}`;