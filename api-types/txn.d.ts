import { PaginationAPIResponse } from "./lib"
export namespace PostTxnAPI
{
    export type FragmentDTO =
    {
        fromAmount: string | null;
        fromCurrency: string | null;
        fromContainer: string | null;
        toAmount: string | null;
        toCurrency: string | null;
        toContainer: string | null;
    };

    export type RequestItemDTO =
    {
        title: string;
        creationDate?: number | null;
        description?: string | null;
        tagIds: string[];
        fragments: PostTxnAPI.FragmentDTO[]
        excludedFromIncomesExpenses: boolean;
    };

    export type RequestDTO =
    {
        transactions: RequestItemDTO[]
    };

    export type ResponseDTO = { id: string[]; };
}

export namespace PutTxnAPI
{
    export type FragmentDTO =
    {
        fromAmount: string | null;
        fromCurrency: string | null;
        fromContainer: string | null;
        toAmount: string | null;
        toCurrency: string | null;
        toContainer: string | null;
    };

    export type RequestItemDTO =
    {
        title: string;
        creationDate?: number | null;
        description?: string | null;
        tagIds: string[];
        fragments: PutTxnAPI.FragmentDTO[];
        excludedFromIncomesExpenses: boolean;
    };

    export type RequestQueryDTO = { targetTxnId: string; };
    export type RequestBodyDTO = RequestItemDTO;
    export type ResponseDTO = { };
}

export namespace GetTxnAPI
{
    export type FragmentDTO =
    {
        fromAmount: string | null;
        fromCurrency: string | null;
        fromContainer: string | null;
        toAmount: string | null;
        toCurrency: string | null;
        toContainer: string | null;
    };

    export type TxnDTO =
    {
        id: string;
        title: string;
        description: string;
        owner: string;
        creationDate: number;
        tagIds: string[];
        changeInValue: string;
        fragments: FragmentDTO[];
        excludedFromIncomesExpenses: boolean;
    }
    export type RequestDTO = {};
    export type ResponseDTO = PaginationAPIResponse<TxnDTO>;
}

export namespace GetTxnJsonQueryAPI
{
    export type Path = `/api/v1/transactions/json-query`;

    export type FragmentDTO =
    {
        fromAmount: string | null;
        fromCurrency: string | null;
        fromContainer: string | null;
        toAmount: string | null;
        toCurrency: string | null;
        toContainer: string | null;
    };

    export type TxnDTO =
    {
        id: string;
        title: string;
        description: string;
        owner: string;
        creationDate: number;
        tagIds: string[];
        changeInValue: string;
        fragments: FragmentDTO[];
        excludedFromIncomesExpenses: boolean;
    }
    export type QueryDTO =
    {
        query: string;
        startIndex: string | undefined;
        endIndex: string | undefined;
    };
    export type ResponseDTO = PaginationAPIResponse<TxnDTO>;
}

export namespace DeleteTxnAPI
{
    export type RequestQueryDTO = { id: string }
    export type ResponseDTO = { };
}