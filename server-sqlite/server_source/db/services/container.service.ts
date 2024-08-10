import createHttpError from "http-errors";
import { ContainerRepository } from "../repositories/container.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { Container } from "../entities/container.entity.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";

export class ContainerService
{
    public static async tryGetContainerByName(ownerId: string, name: string)
    {
        const container = await ContainerRepository.getInstance().findOne(
        {
            where: {name: name, owner: { id: ownerId } },
            relations: { owner: true }
        });
        return {
            containerFound: container !== null,
            container: container
        }
    }

    public static async tryGetContainerById(ownerId: string, id: string)
    {
    const container = await ContainerRepository.getInstance().findOne(
        {
            where: {id: id, owner: { id: ownerId } },
            relations: { owner: true }
        });
        return {
            containerFound: container !== null,
            container: container
        }
    }

    public static async createContainer(ownerId: string, name: string, creationDate: number = Date.now())
    {
        const containerWithSameName = await ContainerService.tryGetContainerByName(ownerId, name);
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

    public static async getManyContainers
    (
        ownerId: string, 
        query: 
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            name?: string | undefined,
            id?: string | undefined
        }
    ): Promise<{ totalCount: number, rangeItems: SQLitePrimitiveOnly<Container>[] }>
    {
        let dbQuery = ContainerRepository.getInstance()
        .createQueryBuilder(`con`)
        .where(`${nameof<Container>("ownerId")} = :ownerId`, { ownerId: ownerId });

        if (query.name) dbQuery = dbQuery.andWhere(`${nameof<Container>("name")} = :name`, { name: query.name })
        if (query.id) dbQuery = dbQuery.andWhere(`${nameof<Container>("id")} = :id`, { id: query.id })
        dbQuery = ServiceUtils.paginateQuery(dbQuery, query);

        const queryResult = await dbQuery.getManyAndCount();
        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0]
        }
    }
}