import type { NamedObject, IDObject } from "../interfaces";

export type Container = { ownersID: string[]; } & NamedObject & IDObject;

export type ValueHydratedContainer = 
{
    value: number,
    valueActual: number,
    balance: {[currencyPubID: string] : number},
    balanceActual: {[currencyPubID: string] : number},
} & Container; 