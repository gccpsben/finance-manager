import { DataSource, Repository } from "typeorm";
import { MeteredRepository } from "../meteredRepository.ts";
import { File } from "../entities/file.entity.ts";
import { QueryRunner } from "typeorm/browser";
import { panic } from "../../std_errors/monadError.ts";
import { UUID } from "node:crypto";

export class FileRepository extends MeteredRepository
{
    #dataSource: DataSource;
    #repository: Repository<File>;

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(File);
    }

    public async getUserFiles(userId: UUID)
    {
        const results = await this.#repository.find({
            where: {
                ownerId: userId ?? null
            }
        });

        return results.map(f => ({
            fileNameReadable: f.fileNameReadable,
            id: f.id
        }));
    }

    public async saveNewFile(
        userId: UUID,
        fileNameReadable: string,
        queryRunner: QueryRunner
    )
    {
        const newFile = await queryRunner.manager.getRepository(File).save(
        {
            fileNameReadable: fileNameReadable,
            ownerId: userId,
        });

        if (!newFile.id) throw panic(`Newly saved attachment contains falsy id column.`);

        return {
            fileNameReadable: newFile.fileNameReadable,
            ownerId: newFile.ownerId,
            id: newFile.id!
        }
    }
}