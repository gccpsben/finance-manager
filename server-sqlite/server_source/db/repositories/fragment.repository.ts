import { Database } from "../db.js";
import { panic } from "../../std_errors/monadError.js";
import { Fragment } from "../entities/fragment.entity.js";

export class FragmentRepository
{
    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        return Database.AppDataSource.getRepository(Fragment);
    }
}