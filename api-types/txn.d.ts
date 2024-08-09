import { PaginationAPIResponse } from "./lib"

export type TransactionDTO = 
{
    id: string;
    title: string;
    description: string | undefined;
    owner: string;
    creationDate: number;
    txnType: string;
    fromAmount: string | undefined;
    fromCurrency: string | undefined;
    fromContainer: string | undefined;
    toAmount: string | undefined;
    toCurrency: string | undefined;
    toContainer: string | undefined;
}

export type PostTransactionDTO = 
{
    title: string;
    creationDate?: number | undefined;
    description?: string | undefined;
    typeId: string;
    fromAmount?: string | undefined;
    fromContainerId?: string | undefined;
    fromCurrencyId?: string | undefined;
    toAmount?: string | undefined;
    toContainerId?: string | undefined;
    toCurrencyId?: string | undefined;
};
export type ResponsePostTransactionDTO = { id: string; };

export type GetTransactionsDTO = {};
export type ResponseGetTransactionsDTO = PaginationAPIResponse<TransactionDTO>;