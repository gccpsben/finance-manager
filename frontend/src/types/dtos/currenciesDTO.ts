import type { NamedObject, PubIDObject } from "../interfaces";

export type CurrencyRateDataSource =
{
    jsonURLHost: string;
    jsonURLPath: string;
    jmesQuery: string;
}

export type RateDefinedCurrency = 
{
    _id: string;
    fallbackRate: number;
    rate: number;
    symbol: string;
    dataSource: CurrencyRateDataSource;

} & NamedObject & PubIDObject;