import path from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { POST_CURRENCY_API_PATH } from './paths.ts';
import { GetCurrencyAPIClass, PostCurrencyAPIClass, PostCurrencyRateDatumAPIClass } from "./classes.ts";
import { getTestServerPath } from '../../init.ts';
import { GET_CURRENCY_API_PATH } from './paths.ts';
import { POST_CURRENCY_RATE_DATUM_API_PATH } from './paths.ts';

export const createPostCurrencyRateDatumFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<
        PostCurrencyRateDatumAPIClass.RequestDTO,
        PostCurrencyRateDatumAPIClass.ResponseDTO>
    (
        'POST',
        path.join(getTestServerPath(), POST_CURRENCY_RATE_DATUM_API_PATH),
        {
            bodyType: PostCurrencyRateDatumAPIClass.ResponseDTO,
            status: 200
        }
    );
};

export const createPostCurrencyFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<
    {
        fallbackRateAmount: string,
        fallbackRateCurrencyId: string,
        ticker: string,
        name: string
    }, PostCurrencyAPIClass.ResponseDTO>
    (
        'POST',
        path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
        {
            bodyType: PostCurrencyAPIClass.ResponseDTO,
            status: 200
        }
    )
};

export const createPostBaseCurrencyFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<
    {
        ticker: string,
        name: string
    }, PostCurrencyAPIClass.ResponseDTO>
    (
        'POST',
        path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
        {
            bodyType: PostCurrencyAPIClass.ResponseDTO,
            status: 200
        }
    )
};

export const createGetCurrenciesFunc = (query: {
    name?: string,
    id?: string,
    date?: string
}) =>
{
    const queryStr = new URLSearchParams(
    {
        ...(query.name === undefined ? {} : { "name": query.name }),
        ...(query.id === undefined ? {} : { "id": query.id }),
        ...(query.date === undefined ? {} : { "date": query.date })
    }).toString();

    return wrapAssertFetchJSONEndpoint<object, GetCurrencyAPIClass.ResponseDTO>
    (
        'GET',
        path.join(getTestServerPath(), GET_CURRENCY_API_PATH, "?", queryStr),
        {
            bodyType: GetCurrencyAPIClass.ResponseDTO,
            status: 200
        }
    )
};