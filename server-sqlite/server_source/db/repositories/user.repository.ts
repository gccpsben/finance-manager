import { Repository } from "typeorm";
import { User } from "../entities/user.entity.js";
import { Database } from "../db.js";

class UserRepositoryExtension
{
    public async customFind(this: Repository<User>) 
    {
        const result = await this.createQueryBuilder()
        .getMany();
        return result;
    }
}

export class UserRepository
{
    private static extendedRepo: Repository<User> & UserRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!UserRepository.extendedRepo) 
            UserRepository.extendedRepo = Database.AppDataSource.getRepository(User).extend(new UserRepositoryExtension())      
        return UserRepository.extendedRepo;
    }
}