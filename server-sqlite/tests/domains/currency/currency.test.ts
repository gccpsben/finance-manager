/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { createPostBaseCurrencyFunc, createGetCurrenciesFunc } from "./helpers.ts";
import { assertEquals } from 'jsr:@std/assert/equals';
import { createPostCurrencyFunc } from './helpers.ts';

Deno.test(
{
    name: "Reject currencies without token",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await createPostCurrencyFunc()
        ({
            token: undefined,
            asserts: { status: 401 },
            body: ['CUSTOM', { name: "BASE_CUR", ticker: "BASE" }],
        });
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
            await createPostCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['CUSTOM', { name: "BASE_CUR" }],
            });
        });

        await test.step("Without name", async () =>
        {
            await createPostCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['CUSTOM', { ticker: "BASE_CUR" }],
            });
        });

        await test.step("With fallbackRateAmount but no fallbackRateCurrencyId", async () =>
        {
            await createPostCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['CUSTOM', { ticker: "BASE_CUR", name: "Base", fallbackRateAmount: "1" }],
            });
        });

        await test.step("With fallbackRateCurrencyId but no fallbackRateAmount", async () =>
        {
            await createPostCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['CUSTOM', { ticker: "BASE_CUR", name: "Base", fallbackRateCurrencyId: "1" }],
            });
        });

        await test.step("With fallbackRateCurrencyId and fallbackRateAmount, but invalid currency", async () =>
        {
            await createPostCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['CUSTOM', { ticker: "BASE_CUR", name: "Base", fallbackRateCurrencyId: "FJVO", fallbackRateAmount: "1" }],
            });
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
            await createPostBaseCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 200 },
                body: ['EXPECTED', { name: currName, ticker: currTicker }],
            });
        });

        await test.step("Reject repeated name currency", async () =>
        {
            await createPostBaseCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['EXPECTED', { name: currName, ticker: currTicker + '-' }],
            });
        });

        await test.step("Reject repeated ticker currency", async () =>
        {
            await createPostBaseCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['EXPECTED', { name: currName + "-", ticker: currTicker }],
            });
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
            const baseCurrency = await createPostBaseCurrencyFunc()
            ({
                token: firstUser.token!,
                asserts: 'default',
                body: ['EXPECTED', { name: testCurrName, ticker: testCurrTicker }]
            });

            postedCurrId = baseCurrency.parsedBody!.id;
        });

        await test.step("Query the posted currency without token", async () =>
        {
            await createGetCurrenciesFunc({ })
            ({
                token: undefined,
                asserts: { status: 401 },
            });
        });

        await test.step("Query the posted currency", async (test) =>
        {
            await test.step("Same ID", async () =>
            {
                const queryResult = await createGetCurrenciesFunc({ id: postedCurrId! })
                ({ token: firstUser.token!, asserts: 'default' });

                assertEquals(queryResult.parsedBody!.rangeItems[0].id, postedCurrId);
            });

            await test.step("Same name", async () =>
            {
                const queryResult = await createGetCurrenciesFunc({ name: testCurrName })
                ({ token: firstUser.token!, asserts: 'default' });

                assertEquals(queryResult.parsedBody!.rangeItems[0].name, testCurrName);
            });
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});