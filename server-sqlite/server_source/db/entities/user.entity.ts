import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate } from "typeorm";
import "reflect-metadata"
import { OneToMany } from "typeorm";
import { AccessToken } from "./accessToken.entity.js";
import { IsNotEmpty, IsString, MaxLength, validate } from "class-validator";

@Entity()
export class User 
{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true, nullable: false })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
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