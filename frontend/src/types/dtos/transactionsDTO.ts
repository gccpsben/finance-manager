import type { NamedObject, PubIDObject } from "../interfaces";

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

export type Transaction = {
    _id: string;
    date: string;
    title: string;
    typeID: string;
    isFromBot: boolean;
    isTypePending: boolean;
    from: ContainerBoundAmount | undefined;
    to: ContainerBoundAmount | undefined;
    isResolved: boolean;
    id: string;
} & NamedObject & PubIDObject;

export type HydratedTransaction = 
{
    changeInValue: number;   
} & Transaction;