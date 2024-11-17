import { Repository } from "typeorm";
import { Database } from "../db.js";
import { CurrencyRateSource } from "../entities/currencyRateSource.entity.js";

class CurrencyRateSourceRepositoryExtension
{

}

export class CurrencyRateSourceRepository
{
    private static extendedRepo: Repository<CurrencyRateSource> & CurrencyRateSourceRepositoryExtension = undefined;

    public static getInstance()
    {
        if (!CurrencyRateSourceRepository.extendedRepo)
            CurrencyRateSourceRepository.extendedRepo = Database.AppDataSource.getRepository(CurrencyRateSource)
                                                        .extend(new CurrencyRateSourceRepositoryExtension());

        return CurrencyRateSourceRepository.extendedRepo;
    }
}