import { Database } from "../db.js";
import { Repository } from "typeorm";
import { Container } from "../entities/container.entity.js";
import { panic } from "../../std_errors/monadError.js";

class ContainerRepositoryExtension
{
    customFind = async function (this: Repository<Container>)
    {
        const result = await this.createQueryBuilder()
        .getMany();
        return result;
    }
}

export class ContainerRepository
{
    private static extendedRepo: (Repository<Container> & ContainerRepositoryExtension) | undefined = undefined;

    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        if (!ContainerRepository.extendedRepo)
            ContainerRepository.extendedRepo = Database.AppDataSource.getRepository(Container).extend(new ContainerRepositoryExtension());

        return ContainerRepository.extendedRepo;
    }
}