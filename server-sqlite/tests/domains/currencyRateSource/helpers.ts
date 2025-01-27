import nodePath from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { getTestServerPath } from "../../init.ts";
import { POST_CURRENCY_RATE_SRC_API_PATH } from "./paths.ts";
import { GetCurrencyRateSourceByIdAPIClass, PostCurrencyRateSourceAPIClass } from "./classes.ts";
import { GET_CURRENCY_RATE_SRC_API_PATH } from './paths.ts';
import { GetCurrencyRateSrcAPIClass } from "./classes.ts";
import { GET_CURRENCY_RATE_SRC_BY_ID_API_PATH } from './paths.ts';

export const createPostCurrencyRateSourceFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<
    {
        refCurrencyId: string,
        refAmountCurrencyId: string,
        hostname: string,
        path: string,
        jsonQueryString: string,
        name: string
    }, PostCurrencyRateSourceAPIClass.ResponseDTO>
    (
        'POST',
        nodePath.join(getTestServerPath(), POST_CURRENCY_RATE_SRC_API_PATH),
        {
            bodyType: PostCurrencyRateSourceAPIClass.ResponseDTO,
            status: 200
        }
    )
};

export const createGetRateSourcesByCurrencyFunc = (currencyId: string) =>
{
    return wrapAssertFetchJSONEndpoint<object, GetCurrencyRateSrcAPIClass.ResponseDTO>
    (
        "GET",
        nodePath.join(getTestServerPath(), GET_CURRENCY_RATE_SRC_API_PATH(currencyId)),
        {
            bodyType: GetCurrencyRateSrcAPIClass.ResponseDTO,
            status: 200
        }
    );
}

export const createGetRateSourceByIdFunc = (srcId: string) =>
{
    return wrapAssertFetchJSONEndpoint<object, GetCurrencyRateSourceByIdAPIClass.ResponseDTO>
    (
        "GET",
        nodePath.join(getTestServerPath(), GET_CURRENCY_RATE_SRC_BY_ID_API_PATH(srcId)),
        {
            bodyType: GetCurrencyRateSourceByIdAPIClass.ResponseDTO,
            status: 200
        }
    );
};