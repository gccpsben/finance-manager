import type { NamedObject, PubIDObject } from "../interfaces";

export type RateDefinedCurrency = 
{
    _id: string;
    fallbackRate: number;
    rate: number;
    symbol: string;
} & NamedObject & PubIDObject;