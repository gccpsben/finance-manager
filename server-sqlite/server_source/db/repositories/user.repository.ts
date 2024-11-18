import { Repository } from "typeorm";
import { User } from "../entities/user.entity.js";
import { Database } from "../db.js";
import { panic } from "../../std_errors/monadError.js";

class UserRepositoryExtension
{
    customFind = async function (this: Repository<User>)
    {
        const result = await this.createQueryBuilder()
        .getMany();
        return result;
    }
}

export class UserRepository
{
    private static extendedRepo: (Repository<User> & UserRepositoryExtension) | undefined = undefined;

    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        if (!UserRepository.extendedRepo)
            UserRepository.extendedRepo = Database.AppDataSource.getRepository(User).extend(new UserRepositoryExtension());

        return UserRepository.extendedRepo;
    }
}