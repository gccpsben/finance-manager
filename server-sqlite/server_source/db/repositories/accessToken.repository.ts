import { Repository } from "typeorm";
import { User } from "../entities/user.entity.js";
import { Database } from "../db.js";
import { AccessToken } from "../entities/accessToken.entity.js";

class AccessTokenRepositoryExtension
{
    public async customFind(this: Repository<User>) 
    {
        const result = await this.createQueryBuilder()
        .getMany();
        return result;
    }
}

export class AccessTokenRepository
{
    private static extendedRepo: Repository<AccessToken> & AccessTokenRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!AccessTokenRepository.extendedRepo) 
            AccessTokenRepository.extendedRepo = Database.AppDataSource.getRepository(AccessToken).extend(new AccessTokenRepositoryExtension())      
        return AccessTokenRepository.extendedRepo;
    }
}