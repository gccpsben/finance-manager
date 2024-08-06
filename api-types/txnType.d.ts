import { PaginationAPIResponse } from "./lib";

export type TransactionTypesDTO = { id: string; name: string; owner: string; };
export type ResponseGetTransactionTypesDTO = PaginationAPIResponse<TransactionTypesDTO>;
export type PostTransactionTypesDTO = { name: string; };
export type ResponsePostTransactionTypesDTO = TransactionTypesDTO;