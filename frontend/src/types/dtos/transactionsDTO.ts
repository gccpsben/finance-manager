import type { NamedObject, IDObject } from "../interfaces";

export type Amount =
{
    currencyID: string;
    value: number;
};

export type ContainerBoundAmount =
{
    containerID: string;
    amount: Amount;
};

export type Transaction =
{
    title: string;
    description: string | null;
    creationDate: string;
    fromAmount: string | null;
    toAmount: string | null;
    owner: string;
    txnTag: string;
    fromCurrency: string | null;
    fromContainer: string | null;
    toCurrency: string | null;
    toContainer: string | null;
} & NamedObject & IDObject;

export type HydratedTransaction =
{
    changeInValue: number;
} & Transaction;