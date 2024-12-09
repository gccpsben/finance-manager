import { PaginationAPIResponse } from "./lib";

export type TxnTagsDTO = { id: string; name: string; owner: string; };

export namespace GetTxnTagsAPI
{
    export type ResponseDTO = PaginationAPIResponse<TxnTagsDTO>;
}

export namespace PostTxnTagsAPI
{
    export type RequestDTO = { name: string };
    export type ResponseDTO = TxnTagsDTO;
}