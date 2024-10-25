import { Database } from "../db.js";
import { Repository } from "typeorm";
import { Container } from "../entities/container.entity.js";

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
    private static extendedRepo: Repository<Container> & ContainerRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!ContainerRepository.extendedRepo)
            ContainerRepository.extendedRepo = Database.AppDataSource.getRepository(Container).extend(new ContainerRepositoryExtension());

        return ContainerRepository.extendedRepo;
    }
}