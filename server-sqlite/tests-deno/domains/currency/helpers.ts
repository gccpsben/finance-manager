import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { assertNotEquals } from "@std/assert/not-equals";
import { POST_CURRENCY_API_PATH } from './paths.ts';
import { GetCurrencyAPIClass, PostCurrencyAPIClass } from "./classes.ts";
import { getTestServerPath } from '../../init.ts';
import { GET_CURRENCY_API_PATH } from './paths.ts';

export async function postCurrency
(
    { token, name, fallbackRateAmount, fallbackRateCurrencyId, ticker }:
    { token: string, name: string, fallbackRateAmount: string, fallbackRateCurrencyId: string, ticker: string },
)
{
    const postResponse = await assertFetchJSON
    (
        path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
        {
            assertStatus: 200, method: "POST",
            headers: { 'authorization': token },
            body: { name, fallbackRateAmount, fallbackRateCurrencyId, ticker },
            expectedBodyType: PostCurrencyAPIClass.ResponseDTO
        }
    );
    assertNotEquals(postResponse.parsedBody, undefined);
    return { currId: postResponse.parsedBody!.id };
}

export async function postBaseCurrency
(
    { token, name, ticker }:
    { token: string, name: string, ticker: string },
)
{
    const postResponse = await assertFetchJSON
    (
        path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
        {
            assertStatus: 200, method: "POST",
            headers: { 'authorization': token },
            body: { name, ticker },
            expectedBodyType: PostCurrencyAPIClass.ResponseDTO
        }
    );
    assertNotEquals(postResponse.parsedBody, undefined);
    return { currId: postResponse.parsedBody!.id };
}

export async function getCurrencies
(
    { token, name, id, date }:
    { token: string, name?: string, id?: string, date?: string },
)
{
    const query = new URLSearchParams(
    {
        ...(name === undefined ? {} : { name }),
        ...(id === undefined ? {} : { id }),
        ...(date === undefined ? {} : { date })
    }).toString();

    const postResponse = await assertFetchJSON
    (
        path.join(getTestServerPath(), GET_CURRENCY_API_PATH, "?", query.toString()),
        {
            assertStatus: 200, method: "GET",
            headers: { 'authorization': token },
            expectedBodyType: GetCurrencyAPIClass.ResponseDTO
        }
    );
    assertNotEquals(postResponse.parsedBody, undefined);
    return { parsedBody: postResponse.parsedBody };
}