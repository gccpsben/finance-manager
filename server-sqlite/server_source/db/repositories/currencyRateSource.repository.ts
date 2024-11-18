import { Repository } from "typeorm";
import { Database } from "../db.js";
import { CurrencyRateSource } from "../entities/currencyRateSource.entity.js";
import { panic } from "../../std_errors/monadError.js";

export class CurrencyRateSourceRepository
{
    private static extendedRepo: Repository<CurrencyRateSource> | undefined = undefined;

    public static getInstance()
    {
        if (!Database.AppDataSource)
            throw panic("Database.AppDataSource is not ready yet.");

        if (!CurrencyRateSourceRepository.extendedRepo)
            CurrencyRateSourceRepository.extendedRepo = Database.AppDataSource.getRepository(CurrencyRateSource);

        return CurrencyRateSourceRepository.extendedRepo;
    }
}