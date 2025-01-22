import { Repository } from "typeorm";
import { Database } from "../db.ts";
import { CurrencyRateSource } from "../entities/currencyRateSource.entity.ts";
import { panic } from "../../std_errors/monadError.ts";

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