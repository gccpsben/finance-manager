/// <reference lib="deno.ns" />

import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { POST_CURRENCY_API_PATH } from './paths.ts';
import { PostCurrencyAPIClass } from "./classes.ts";
import { getTestServerPath } from '../../init.ts';
import { GET_CURRENCY_API_PATH } from './paths.ts';
import { getCurrencies, postBaseCurrency } from "./helpers.ts";
import { assertEquals } from 'jsr:@std/assert/equals';

Deno.test(
{
    name: "Reject currencies without token",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
            {
                assertStatus: 401, method: "POST",
                body: { name: "BASE_CUR", ticker: "BASE" } satisfies Pick<PostCurrencyAPIClass.RequestDTO, 'ticker' | 'name'>,
                expectedBodyType: PostCurrencyAPIClass.ResponseDTO
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject currencies without valid body",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await test.step("Without ticker", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { name: "BASE_CUR"} satisfies Pick<PostCurrencyAPIClass.RequestDTO, 'name'>,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });

        await test.step("Without name", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { ticker: "BASE_CUR"} satisfies Pick<PostCurrencyAPIClass.RequestDTO, 'ticker'>,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });

        await test.step("With fallbackRateAmount but no fallbackRateCurrencyId", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { ticker: "BASE_CUR", name: "Base", fallbackRateAmount: "1" } satisfies Omit<PostCurrencyAPIClass.RequestDTO, 'fallbackRateCurrencyId'>,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });

        await test.step("With fallbackRateCurrencyId but no fallbackRateAmount", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { ticker: "BASE_CUR", name: "Base", fallbackRateCurrencyId: "1" } satisfies Omit<PostCurrencyAPIClass.RequestDTO, 'fallbackRateAmount'>,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });

        await test.step("With fallbackRateCurrencyId and fallbackRateAmount, but invalid currency", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { ticker: "BASE_CUR", name: "Base", fallbackRateCurrencyId: "FJVO", fallbackRateAmount: "1" } satisfies PostCurrencyAPIClass.RequestDTO,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject repeated name / ticker currencies",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];
        const currName = "BASE_CUR";
        const currTicker = "BASE";

        await test.step("Accept first currency", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 200, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { name: currName, ticker: currTicker } satisfies Pick<PostCurrencyAPIClass.RequestDTO, 'ticker' | 'name'>,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });

        await test.step("Reject repeated name currency", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { name: currName, ticker: currTicker + '-' } satisfies Pick<PostCurrencyAPIClass.RequestDTO, 'ticker' | 'name'>,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });

        await test.step("Reject repeated ticker currency", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { "authorization":  firstUser.token! },
                    body: { name: currName + "-", ticker: currTicker } satisfies Pick<PostCurrencyAPIClass.RequestDTO, 'ticker' | 'name'>,
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                }
            );
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Accept creating base currency with token",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];
        const testCurrName = "BASE_CURR";
        const testCurrTicker = "BASE";
        let postedCurrId: string;

        await test.step("Accept base currency", async () =>
        {
            const res = await postBaseCurrency({ name: testCurrName, ticker: testCurrTicker, token: firstUser.token! });
            postedCurrId = res.currId;
        });

        await test.step("Query the posted currency without token", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), GET_CURRENCY_API_PATH),
                {
                    assertStatus: 401,
                    method: "GET",
                }
            );
        });

        await test.step("Query the posted currency", async (test) =>
        {
            await test.step("Same ID", async () =>
            {
                const queryResult = await getCurrencies({ token: firstUser.token!, id: postedCurrId! });
                assertEquals(queryResult.parsedBody!.rangeItems[0].id, postedCurrId);
            });

            await test.step("Same name", async () =>
            {
                const queryResult = await getCurrencies({ token: firstUser.token!, name: testCurrName });
                assertEquals(queryResult.parsedBody!.rangeItems[0].name, testCurrName);
            });
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});