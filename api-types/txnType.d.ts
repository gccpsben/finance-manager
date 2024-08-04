export type TransactionTypesDTO = { id: string; name: string; owner: string; };
export type ResponseGetTransactionTypesDTO = TransactionTypesDTO[];
export type PostTransactionTypesDTO = { name: string; };
export type ResponsePostTransactionTypesDTO = TransactionTypesDTO;