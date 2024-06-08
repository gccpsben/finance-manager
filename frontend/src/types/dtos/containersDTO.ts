import type { NamedObject, PubIDObject } from "../interfaces";

export type Container = { ownersID: string[]; } & NamedObject & PubIDObject;

export type ValueHydratedContainer = 
{
    value: number,
    valueActual: number,
    balance: {[currencyPubID: string] : number},
    balanceActual: {[currencyPubID: string] : number},
} & Container; 