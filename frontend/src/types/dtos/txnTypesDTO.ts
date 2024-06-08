import type { NamedObject, PubIDObject } from "../interfaces";

export type TxnType = Omit<
{
    _id: string;
    name: string;
    isEarning: boolean;
    isExpense: boolean;
} & NamedObject & PubIDObject, '__v'>;