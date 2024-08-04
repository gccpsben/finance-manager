import type { NamedObject, IDObject } from "../interfaces";
import type { User } from "./usersDTO";

export type CurrencyRateDataSource =
{
    jsonURLHost: string;
    jsonURLPath: string;
    jmesQuery: string;
}

export type Currency =
{
    name: string;
    amount?: string | null;
    isBase: boolean;
    ticker: string;
    owner: User;
    refCurrency?: string | null;

} & IDObject

export type RateDefinedCurrency = 
{
    rateToBase: string;
} & Currency;