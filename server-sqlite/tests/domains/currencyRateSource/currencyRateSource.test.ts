import { ensureTestIsSetup, port } from "../../init.ts";
import { dictWithoutKeys } from "../../lib/assertions.ts";
import { resetDatabase } from "../server/helpers.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { assertEquals } from 'jsr:@std/assert/equals';
import { createPostBaseCurrencyFunc, createPostCurrencyFunc } from "../currency/helpers.ts";
import { PostCurrencyRateSrcAPI } from "../../../../api-types/currencyRateSource.d.ts";
import { createGetRateSourceByIdFunc, createGetRateSourcesByCurrencyFunc, createPostCurrencyRateSourceFunc } from "./helpers.ts";
import { randomUUID } from 'node:crypto';

Deno.test(
{
    name: "Reject getting unknown currency rate srcs",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await createGetRateSourcesByCurrencyFunc('an unknown cid')
        ({
            token: firstUser.token!,
            asserts: { status: 400 }
        });
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

        const firstCurrency = await createPostBaseCurrencyFunc()
        ({ token: firstUser.token!, asserts: 'default', body: ['EXPECTED', { name: "BASE", ticker: "BASE" }] });

        await createGetRateSourcesByCurrencyFunc(firstCurrency.parsedBody!.id)
        ({
            token:firstUser.token + "_",
            asserts: { status: 401 }
        });
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

        await createPostCurrencyRateSourceFunc()
        ({
            token:firstUser.token + "_",
            asserts: { status: 401 }
        });
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
                await createPostCurrencyRateSourceFunc()
                ({
                    token:firstUser.token,
                    asserts: { status: 400 },
                    body: ['CUSTOM', bodyToPost]
                });
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

        const firstCurrency = await createPostBaseCurrencyFunc()
        ({ token: firstUser.token!, asserts: 'default', body: ['EXPECTED', { name: "BASE", ticker: "BASE" }] });

        const secondCurrency = await createPostCurrencyFunc()
        ({
            token: firstUser.token!,
            asserts: 'default',
            body: [
                'EXPECTED',
                {
                    name: "SEC",
                    ticker: "SEC",
                    fallbackRateAmount: "1",
                    fallbackRateCurrencyId: firstCurrency.parsedBody!.id
                }
            ],
        });

        const validCurrencyRateSrcBody: PostCurrencyRateSrcAPI.RequestDTO =
        {
            hostname: "http://localhost:1234",
            path: "/test",
            name: "My New API Source",
            jsonQueryString: "testing",
            refAmountCurrencyId: firstCurrency.parsedBody!.id,
            refCurrencyId: secondCurrency.parsedBody!.id
        };

        let postedSrcId: string;
        await test.step("Posting source", async () =>
        {
            const response = await createPostCurrencyRateSourceFunc()
            (
                {
                    asserts: 'default',
                    body: ['EXPECTED', validCurrencyRateSrcBody],
                    token: firstUser.token!
                }
            );
            postedSrcId = response.parsedBody!.id;
        });

        await test.step("Getting nonexistence currency (invalid uuid)", async () =>
        {
            await createGetRateSourcesByCurrencyFunc(secondCurrency.parsedBody!.id + "_")
            ({ token: firstUser.token!, asserts: { status: 400 } });
        });

        await test.step("Getting nonexistence currency (valid uuid)", async () =>
        {
            const response = await createGetRateSourcesByCurrencyFunc(randomUUID())
            ({ token: firstUser.token!, asserts: 'default' });

            assertEquals(response.parsedBody?.sources, []);
        });

        await test.step("Getting source by currId", async () =>
        {
            const response = await createGetRateSourcesByCurrencyFunc(secondCurrency.parsedBody!.id)
            ({ token: firstUser.token!, asserts: 'default' });

            assertEquals(response.parsedBody?.sources[0].hostname, validCurrencyRateSrcBody.hostname);
            assertEquals(response.parsedBody?.sources[0].jsonQueryString, validCurrencyRateSrcBody.jsonQueryString);
            assertEquals(response.parsedBody?.sources[0].name, validCurrencyRateSrcBody.name);
            assertEquals(response.parsedBody?.sources[0].path, validCurrencyRateSrcBody.path);
            assertEquals(response.parsedBody?.sources[0].refAmountCurrencyId, validCurrencyRateSrcBody.refAmountCurrencyId);
            assertEquals(response.parsedBody?.sources[0].refCurrencyId, validCurrencyRateSrcBody.refCurrencyId);
        });

        await test.step("Getting source by srcId", async () =>
        {
            const response = await createGetRateSourceByIdFunc(postedSrcId)
            ({ token: firstUser.token!, asserts: 'default' });

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