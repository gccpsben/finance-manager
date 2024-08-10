import { PaginationAPIResponse } from "./lib";

export type TxnTypesDTO = { id: string; name: string; owner: string; };

export namespace GetTxnTypesAPI
{
    export type ResponseDTO = PaginationAPIResponse<TxnTypesDTO>;
}

export namespace PostTxnTypesAPI
{
    export type RequestDTO = { name: string };
    export type ResponseDTO = TxnTypesDTO;
}