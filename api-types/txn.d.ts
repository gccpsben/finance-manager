import { PaginationAPIResponse } from "./lib"
export namespace PostTxnAPI
{
    export type RequestItemDTO =
    {
        title: string;
        creationDate?: number | null;
        description?: string | null;
        tagIds: string[];
        fromAmount?: string | null;
        fromContainerId?: string | null;
        fromCurrencyId?: string | null;
        toAmount?: string | null;
        toContainerId?: string | null;
        toCurrencyId?: string | null;
    };

    export type RequestDTO =
    {
        transactions: RequestItemDTO[]
    };

    export type ResponseDTO = { id: string[]; };
}

export namespace PutTxnAPI
{
    export type RequestQueryDTO = { targetTxnId: string; };
    export type RequestBodyDTO = PostTxnAPI.RequestItemDTO;
    export type ResponseDTO = { };
}

export namespace GetTxnAPI
{
    export type TxnDTO =
    {
        id: string;
        title: string;
        description: string;
        owner: string;
        creationDate: number;
        tagIds: string[];
        fromAmount: string | null;
        fromCurrency: string | null;
        fromContainer: string | null;
        toAmount: string | null;
        toCurrency: string | null;
        toContainer: string | null;
        changeInValue: string;
    }
    export type RequestDTO = {};
    export type ResponseDTO = PaginationAPIResponse<TxnDTO>;
}

export namespace DeleteTxnAPI
{
    export type RequestQueryDTO = { id: string }
    export type ResponseDTO = { };
}