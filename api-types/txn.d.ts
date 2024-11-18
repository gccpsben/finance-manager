import { PaginationAPIResponse } from "./lib"
export namespace PostTxnAPI
{
    export type RequestDTO =
    {
        title: string;
        creationDate?: number | null;
        description?: string | null;
        txnTypeId: string;
        fromAmount?: string | null;
        fromContainerId?: string | null;
        fromCurrencyId?: string | null;
        toAmount?: string | null;
        toContainerId?: string | null;
        toCurrencyId?: string | null;
    };

    export type ResponseDTO = { id: string; };
}

export namespace PutTxnAPI
{
    export type RequestQueryDTO = { targetTxnId: string; };
    export type RequestBodyDTO = PostTxnAPI.RequestDTO;
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
        txnType: string;
        fromAmount: string | null;
        fromCurrency: string | null;
        fromContainer: string | null;
        toAmount: string | null;
        toCurrency: string | null;
        toContainer: string | null;
    }
    export type RequestDTO = {};
    export type ResponseDTO = PaginationAPIResponse<TxnDTO>;
}