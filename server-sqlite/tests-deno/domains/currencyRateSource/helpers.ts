import nodePath from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { getTestServerPath } from "../../init.ts";
import { POST_CURRENCY_RATE_SRC_API_PATH } from "./paths.ts";
import { GetCurrencyRateSourceByIdAPIClass, PostCurrencyRateSourceAPIClass } from "./classes.ts";
import { assertNotEquals } from "@std/assert/not-equals";
import { GET_CURRENCY_RATE_SRC_API_PATH } from './paths.ts';
import { GetCurrencyRateSrcAPIClass } from "./classes.ts";
import { GET_CURRENCY_RATE_SRC_BY_ID_API_PATH } from './paths.ts';

export async function postCurrencyRateSource
(
    { token, refCurrencyId, refAmountCurrencyId, hostname, path, jsonQueryString, name }:
    { token: string, refCurrencyId: string, refAmountCurrencyId: string, hostname: string, path: string, jsonQueryString: string, name: string },
)
{
    const postResponse = await assertFetchJSON
    (
        nodePath.join(getTestServerPath(), POST_CURRENCY_RATE_SRC_API_PATH),
        {
            assertStatus: 200, method: "POST",
            headers: { 'authorization': token },
            body: { refCurrencyId, refAmountCurrencyId, hostname, path, jsonQueryString, name },
            expectedBodyType: PostCurrencyRateSourceAPIClass.ResponseDTO
        }
    );

    assertNotEquals(postResponse.parsedBody, undefined);
    return { parsedBody: postResponse.parsedBody };
}

export async function getRateSourcesByCurrency
(
    { token, currencyId, assert = true }:
    { token: string, currencyId: string, assert:boolean },
)
{
    const postResponse = await assertFetchJSON
    (
        nodePath.join(getTestServerPath(), GET_CURRENCY_RATE_SRC_API_PATH(currencyId)),
        {
            assertStatus: assert ? 200 : false, method: "GET",
            headers: { 'authorization': token },
            expectedBodyType: GetCurrencyRateSrcAPIClass.ResponseDTO
        }
    );

    if (assert) assertNotEquals(postResponse.parsedBody, undefined);
    return { parsedBody: postResponse.parsedBody, rawResponse: postResponse };
}


export async function getRateSourceById
(
    { token, srcId }:
    { token: string, srcId: string },
)
{
    const postResponse = await assertFetchJSON
    (
        nodePath.join(getTestServerPath(), GET_CURRENCY_RATE_SRC_BY_ID_API_PATH(srcId)),
        {
            assertStatus: 200, method: "GET",
            headers: { 'authorization': token },
            expectedBodyType: GetCurrencyRateSourceByIdAPIClass.ResponseDTO
        }
    );

    assertNotEquals(postResponse.parsedBody, undefined);
    return { parsedBody: postResponse.parsedBody };
}