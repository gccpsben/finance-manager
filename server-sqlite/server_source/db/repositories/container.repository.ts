import { DataSource, Repository } from "typeorm";
import { Container } from "../entities/container.entity.ts";
import { panic } from "../../std_errors/monadError.ts";
import { QUERY_IGNORE } from "../../symbols.ts";
import { ServiceUtils } from "../servicesUtils.ts";
import { MeteredRepository } from "../meteredRepository.ts";

export class ContainerRepository extends MeteredRepository
{
    #dataSource: DataSource;
    #repository: Repository<Container>;

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(Container);
    }

    public getWhereQuery(
        ownerId: string,
        containerId: string | typeof QUERY_IGNORE,
        containerName: string | typeof QUERY_IGNORE
    ) {
        const output: {[key: string]: any} = { ownerId: ownerId };
        if (containerId !== QUERY_IGNORE) output['id'] = containerId;
        if (containerName !== QUERY_IGNORE) output['name'] = containerName;
        return output;
    }

    public async getContainer(
        ownerId: string,
        containerId: string | typeof QUERY_IGNORE,
        containerName: string | typeof QUERY_IGNORE
    )
    {
        const makeOutput = (curr: Partial<Container>) => {
            return {
                id: curr.id!,
                name: curr.name!,
                ownerId: curr.ownerId!,
                creationDate: curr.creationDate
            }
        };

        this.incrementRead();
        const container = await this.#repository.findOne(
        {
            where: this.getWhereQuery(ownerId, containerId, containerName),
            relations: { owner: false }
        });
        if (!container) return null;

        return makeOutput(container);
    }

    public async getManyContainers(
        ownerId: string,
        containerId: string | typeof QUERY_IGNORE,
        containerName: string | typeof QUERY_IGNORE,
        startIndex?: number | undefined, endIndex?: number | undefined,
    )
    {
        let dbQuery = this.#repository!
        .createQueryBuilder(`con`)
        .where(this.getWhereQuery(ownerId, containerId, containerName));

        dbQuery = ServiceUtils.paginateQuery(dbQuery, { endIndex: endIndex, startIndex: startIndex });

        this.incrementRead();
        const queryResult = await dbQuery.getManyAndCount();
        if (queryResult[0].some(x => !x.id)) throw panic(`Containers queried from database contain falsy IDs.`);

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0].map(c => ({
                id: c.id!,
                creationDate: c.creationDate,
                name: c.name,
                ownerId: c.ownerId
            }))
        }
    }

    /**
     * Write (insert) a new container into the database.
     * This will NOT check beforehand if the container exists or not.
     * This will NOT check for constrains / validations beforehand.
     * Any error reported by the database engine will be thrown as exception.
     */
    public async saveNewContainer(ownerId: string, name: string, creationDate: number = Date.now())
        : Promise<{id: string, name: string, creationDate: number}>
    {
        const newContainer = this.#repository.create();
        newContainer.creationDate = creationDate;
        newContainer.name = name;
        newContainer.ownerId = ownerId;
        this.incrementWrite();
        const savedNewContainer = await this.#repository.save(newContainer);
        if (!savedNewContainer.id) throw panic(`Container saved to database contain falsy IDs.`);
        return {
            creationDate: savedNewContainer.creationDate,
            id: savedNewContainer.id,
            name: savedNewContainer.name
        };
    }
}