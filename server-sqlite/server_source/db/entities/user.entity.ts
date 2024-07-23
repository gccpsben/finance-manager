import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, PrimaryColumn, Unique, BeforeInsert, BeforeUpdate } from "typeorm";
import "reflect-metadata"
import { DataSource, OneToMany, ManyToOne } from "typeorm";
import { AccessToken } from "./accessToken.entity.js";
import { IsArray, IsNotEmpty, IsString, validate } from "class-validator";

@Entity()
export class User 
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true, nullable: false })
    @IsString()
    @IsNotEmpty()
    username: string;

    @OneToMany(type => AccessToken, accessToken => accessToken.owner)
    accessTokens: AccessToken[];
    
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