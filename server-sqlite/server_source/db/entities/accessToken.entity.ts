import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, PrimaryColumn, BeforeInsert, BeforeUpdate } from "typeorm";
import "reflect-metadata"
import { DataSource, OneToMany, ManyToOne } from "typeorm";
import { User } from "./user.entity.js";
import { IsDate, validate } from "class-validator";

@Entity()
export class AccessToken
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    @IsDate()
    creationDate: Date;

    @ManyToOne(type => User, user => user.accessTokens, { nullable: false })
    owner: User;

    @BeforeInsert()
    @BeforeUpdate()
    public async validate() 
    {
        const errors = await validate(this);
        if (errors?.length) 
        {
            console.error(errors[0]);
            throw errors[0];
        }
    }
}