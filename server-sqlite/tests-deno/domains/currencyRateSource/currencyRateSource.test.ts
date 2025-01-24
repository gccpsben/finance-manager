import path from "node:path";
import { ensureTestIsSetup, getTestServerPath, port } from "../../init.ts";
import { assertFetchJSON, dictWithoutKeys } from "../../lib/assertions.ts";
import { resetDatabase } from "../server/helpers.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { GET_CURRENCY_RATE_SRC_API_PATH } from "./paths.ts";
import { GetCurrencyRateSrcAPIClass, PostCurrencyRateSourceAPIClass } from "./classes.ts";
import { assertEquals } from 'jsr:@std/assert/equals';
import { postBaseCurrency, postCurrency } from "../currency/helpers.ts";
import { POST_CURRENCY_RATE_SRC_API_PATH } from './paths.ts';
import { PostCurrencyRateSrcAPI } from "../../../../api-types/currencyRateSource.d.ts";
import { getRateSourcesByCurrency, getRateSourceById } from "./helpers.ts";

Deno.test(
{
    name: "Reject getting unknown currency rate srcs",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        const response = await assertFetchJSON
        (
            path.join(getTestServerPath(), GET_CURRENCY_RATE_SRC_API_PATH("an unknown cid")),
            {
                assertStatus: 200, method: "GET",
                headers: { 'authorization': firstUser.token! },
                expectedBodyType: GetCurrencyRateSrcAPIClass.ResponseDTO
            }
        );

        assertEquals(response.parsedBody?.sources.length, 0);
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject getting currency rate srcs incorrect token",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        const firstCurrency = await postBaseCurrency({ token: firstUser.token!, name: "BASE", ticker: "BASE" });

        await assertFetchJSON
        (
            path.join(getTestServerPath(), GET_CURRENCY_RATE_SRC_API_PATH(firstCurrency.currId)),
            {
                assertStatus: 401, method: "GET",
                headers: { 'authorization': firstUser.token + "_" }
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject posting currency rate srcs without token",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_CURRENCY_RATE_SRC_API_PATH),
            {
                assertStatus: 401, method: "POST",
                headers: { 'authorization': firstUser.token + "_" }
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject posting currency rate srcs without all props",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];
        const validCurrencyRateSrcBody: PostCurrencyRateSrcAPI.RequestDTO =
        {
            hostname: "http://localhost:1234",
            path: "/test",
            name: "My New API Source",
            jsonQueryString: "testing",
            refAmountCurrencyId: "_curr",
            refCurrencyId: "_curr"
        };

        for (const key of Object.keys(validCurrencyRateSrcBody))
        {
            const bodyToPost = dictWithoutKeys(validCurrencyRateSrcBody, [key]);

            await test.step(`Missing ${key}`, async () =>
            {
                await assertFetchJSON
                (
                    path.join(getTestServerPath(), POST_CURRENCY_RATE_SRC_API_PATH),
                    {
                        assertStatus: 400, method: "POST",
                        headers: { 'authorization': firstUser.token! },
                        body: bodyToPost
                    }
                );
            });
        }
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Allow posting / getting srcs",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];
        const firstCurrency = await postBaseCurrency({ token: firstUser.token!, name: "BASE", ticker: "BASE" });
        const secondCurrency = await postCurrency({
            token: firstUser.token!,
            name: "SEC",
            ticker: "SEC",
            fallbackRateAmount: "1",
            fallbackRateCurrencyId: firstCurrency.currId
        });

        const validCurrencyRateSrcBody: PostCurrencyRateSrcAPI.RequestDTO =
        {
            hostname: "http://localhost:1234",
            path: "/test",
            name: "My New API Source",
            jsonQueryString: "testing",
            refAmountCurrencyId: firstCurrency.currId,
            refCurrencyId: secondCurrency.currId
        };

        let postedSrcId: string;
        await test.step("Posting source", async () =>
        {
            const response = await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_CURRENCY_RATE_SRC_API_PATH),
                {
                    assertStatus: 200, method: "POST",
                    headers: { 'authorization': firstUser.token! },
                    body: validCurrencyRateSrcBody,
                    expectedBodyType: PostCurrencyRateSourceAPIClass.ResponseDTO
                }
            );
            postedSrcId = response.parsedBody!.id;
        });

        await test.step("Getting nonexistence currency", async () =>
        {
            const response = await getRateSourcesByCurrency({ token: firstUser.token!, currencyId: secondCurrency.currId + "_", assert: false });
            // TODO: Should return 404, not just empty array
            assertEquals(response.parsedBody?.sources, []);
            assertEquals(response.rawResponse.res.status, 200);
        });

        await test.step("Getting source by currId", async () =>
        {
            const response = await getRateSourcesByCurrency({ token: firstUser.token!, currencyId: secondCurrency.currId, assert: true });

            assertEquals(response.parsedBody?.sources[0].hostname, validCurrencyRateSrcBody.hostname);
            assertEquals(response.parsedBody?.sources[0].jsonQueryString, validCurrencyRateSrcBody.jsonQueryString);
            assertEquals(response.parsedBody?.sources[0].name, validCurrencyRateSrcBody.name);
            assertEquals(response.parsedBody?.sources[0].path, validCurrencyRateSrcBody.path);
            assertEquals(response.parsedBody?.sources[0].refAmountCurrencyId, validCurrencyRateSrcBody.refAmountCurrencyId);
            assertEquals(response.parsedBody?.sources[0].refCurrencyId, validCurrencyRateSrcBody.refCurrencyId);
        });

        await test.step("Getting source by srcId", async () =>
        {
            const response = await getRateSourceById({ token: firstUser.token!, srcId: postedSrcId });

            assertEquals(response.parsedBody?.hostname, validCurrencyRateSrcBody.hostname);
            assertEquals(response.parsedBody?.jsonQueryString, validCurrencyRateSrcBody.jsonQueryString);
            assertEquals(response.parsedBody?.name, validCurrencyRateSrcBody.name);
            assertEquals(response.parsedBody?.path, validCurrencyRateSrcBody.path);
            assertEquals(response.parsedBody?.refAmountCurrencyId, validCurrencyRateSrcBody.refAmountCurrencyId);
            assertEquals(response.parsedBody?.refCurrencyId, validCurrencyRateSrcBody.refCurrencyId);
        });
    },

    sanitizeOps: false,
    sanitizeResources: false
});