import path from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { GetTxnAPIClass, GetTxnJSONQueryAPIClass, PostTxnAPIClass, PutTxnAPIClass } from "./classes.ts";
import { getTestServerPath } from "../../init.ts";
import { GET_TXN_JSON_API_PATH, POST_TXN_API_PATH } from "./paths.ts";
import { GET_TXN_API_PATH, PUT_TXN_API_PATH } from './paths.ts';
import { DeleteTxnAPI } from "../../../../api-types/txn.d.ts";
import { DELETE_TXN_API_PATH } from './paths.ts';

export const createDelTransactionFunc = ({ id }: DeleteTxnAPI.RequestQueryDTO) =>
{
    return wrapAssertFetchJSONEndpoint<
        never,
        object
    >
    (
        'DELETE',
        path.join(getTestServerPath(), DELETE_TXN_API_PATH, `?${new URLSearchParams({ id })}`),
        {
            bodyType: undefined,
            status: 200
        }
    )
};


export const createPutTransactionFunc = ({ targetTxnId }: PutTxnAPIClass.RequestQueryDTOClass ) =>
{
    return wrapAssertFetchJSONEndpoint<
        PutTxnAPIClass.RequestBodyDTOClass,
        object
    >
    (
        'PUT',
        path.join(getTestServerPath(), PUT_TXN_API_PATH, `?${new URLSearchParams({ targetTxnId })}`),
        {
            bodyType: undefined,
            status: 200
        }
    )
};

export const createPostTransactionFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<
        PostTxnAPIClass.RequestDTOClass,
        PostTxnAPIClass.ResponseDTOClass
    >
    (
        'POST',
        path.join(getTestServerPath(), POST_TXN_API_PATH),
        {
            bodyType: PostTxnAPIClass.ResponseDTOClass,
            status: 200
        }
    )
};

export const createGetTransactionsFunc = (
    { title, id, startDate, endDate }:
    { title?: string, id?: string, startDate?: string, endDate?: string }
) =>
{
    const searchParamsStr = (new URLSearchParams(
    {
        ... title === undefined ? {} : { title },
        ... id === undefined ? {} : { id },
        ... startDate === undefined ? {} : { startDate },
        ... endDate === undefined ? {} : { endDate }
    })).toString();

    return wrapAssertFetchJSONEndpoint<
        object,
        GetTxnAPIClass.ResponseDTOClass
    >
    (
        'GET',
        path.join(getTestServerPath(), GET_TXN_API_PATH, searchParamsStr === "" ? "" : `?${searchParamsStr}`),
        {
            bodyType: GetTxnAPIClass.ResponseDTOClass,
            status: 200
        }
    )
};

export const createGetTransactionsJSONFunc = (
    { query, startIndex, endIndex }:
    { query?: string, startIndex?: string, endIndex?: string }
) =>
{
    const searchParamsStr = (new URLSearchParams(
    {
        ... query === undefined ? {} : { query },
        ... startIndex === undefined ? {} : { startIndex },
        ... endIndex === undefined ? {} : { endIndex },
    })).toString();

    return wrapAssertFetchJSONEndpoint<
        object,
        GetTxnJSONQueryAPIClass.ResponseDTOClass
    >
    (
        'GET',
        path.join(getTestServerPath(), GET_TXN_JSON_API_PATH, searchParamsStr === "" ? "" : `?${searchParamsStr}`),
        {
            bodyType: GetTxnJSONQueryAPIClass.ResponseDTOClass,
            status: 200
        }
    )
};