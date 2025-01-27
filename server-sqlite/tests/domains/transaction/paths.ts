import { GetTxnJsonQueryAPI } from "../../../../api-types/txn.d.ts";
export const POST_TXN_API_PATH = `/api/v1/transactions`;
export const GET_TXN_API_PATH = `/api/v1/transactions`;
export const PUT_TXN_API_PATH = `/api/v1/transactions`;
export const DELETE_TXN_API_PATH = `/api/v1/transactions`;
export const GET_TXN_JSON_API_PATH = `/api/v1/transactions/json-query` satisfies GetTxnJsonQueryAPI.Path