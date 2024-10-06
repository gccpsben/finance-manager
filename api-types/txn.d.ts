import { PaginationAPIResponse } from "./lib"

export type TxnDTO = 
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
export namespace PostTxnAPI
{
    export type RequestDTO =
    {
        title: string;
        creationDate?: number | undefined;
        description?: string | undefined;
        txnTypeId: string;
        fromAmount?: string | undefined;
        fromContainerId?: string | undefined;
        fromCurrencyId?: string | undefined;
        toAmount?: string | undefined;
        toContainerId?: string | undefined;
        toCurrencyId?: string | undefined;
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
    export type RequestDTO = {};
    export type ResponseDTO = PaginationAPIResponse<TxnDTO>;
}