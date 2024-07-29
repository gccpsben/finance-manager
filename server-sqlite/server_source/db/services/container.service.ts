import createHttpError from "http-errors";
import { ContainerRepository } from "../repositories/container.repository.js";
import { UserRepository } from "../repositories/user.repository.js";

export class ContainerService
{
    public static async tryGetContainerByName(name: string)
    {
        const container = await ContainerRepository.getInstance().findOne({where: {name: name}});
        return {
            containerFound: container !== null,
            container: container
        }
    }

    public static async tryGetContainerById(id: string)
    {
        const container = await ContainerRepository.getInstance().findOne({where: {id: id}});
        return {
            containerFound: container !== null,
            container: container
        }
    }

    public static async createContainer(ownerId: string, name: string, creationDate: Date = new Date())
    {
        const containerWithSameName = await ContainerService.tryGetContainerByName(name);
        if (containerWithSameName.containerFound)
            throw createHttpError(400, `Container with name '${name}' already exists.`);
        const newContainer = ContainerRepository.getInstance().create();
        newContainer.creationDate = creationDate;
        newContainer.name = name;
        newContainer.owner = await UserRepository.getInstance().findOne({where: {id: ownerId}});
        return await ContainerRepository.getInstance().save(newContainer);
    }

    public static async getOneContainer(ownerId: string, query: {
        name? : string | undefined,
        id? : string | undefined
    })
    {
        return await ContainerRepository.getInstance().findOne(
        {
            where:
            {
                id: query.id,
                name: query.name,
                owner: {id: ownerId}
            }
        });
    }

    public static async getManyContainers(ownerId: string, query: {
        name?: string | undefined,
        id?: string | undefined
    })
    {
        return await ContainerRepository.getInstance().find(
        {
            where:
            {
                ...query,
                owner: {id: ownerId}
            }
        });
    }
}