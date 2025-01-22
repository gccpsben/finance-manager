import { Database } from "../db.ts";
import { panic } from "../../std_errors/monadError.ts";
import { Fragment } from "../entities/fragment.entity.ts";

export class FragmentRepository
{
    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        return Database.AppDataSource.getRepository(Fragment);
    }
}