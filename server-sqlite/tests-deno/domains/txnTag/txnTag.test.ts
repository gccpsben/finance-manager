/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { assertEqual } from '../../../tests/lib/assert.ts';
import { createPostTxnTagFunc, createGetTxnTagsFunc } from "./helpers.ts";

const getValidTagBody = () => { return { name: 'my test tag' } };

const beforeEachSetup = async (test: Deno.TestContext) =>
{
    await ensureTestIsSetup();
    await resetDatabase();

    const testUsername = "USER_1";
    const testPassword = "PASS_1";
    let testUserToken: string;

    await test.step("Creating users for test", async () =>
    {
        const userCreated = await AuthHelpers.registerMockUsersArray(
        {
            port: port!,
            usersCreds: [ { username: testUsername, password: testPassword } ]
        });
        testUserToken = userCreated[testUsername];
    });

    return testUserToken!;
};

Deno.test(
{
    name: "Disallow missing tag name",
    async fn(test)
    {
        const testUserToken = await beforeEachSetup(test);

        await createPostTxnTagFunc()(
        {
            token: testUserToken!,
            asserts: { status: 400 },
            body: ['CUSTOM', {}],
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Disallow incorrect name data type.",
    async fn(test)
    {
        const testUserToken = await beforeEachSetup(test);

        await createPostTxnTagFunc()(
        {
            token: testUserToken!,
            asserts: { status: 400 },
            body: ['CUSTOM', { name: [] }],
        });

        await createPostTxnTagFunc()(
        {
            token: testUserToken!,
            asserts: { status: 400 },
            body: ['CUSTOM', { name: {} }],
        });

        await createPostTxnTagFunc()(
        {
            token: testUserToken!,
            asserts: { status: 400 },
            body: ['CUSTOM', { name: 12312 }],
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Disallow posting without token",
    async fn(test)
    {
        const testUserToken = await beforeEachSetup(test);

        await test.step("Incorrect token", async () =>
        {
            await createPostTxnTagFunc()(
            {
                token: testUserToken + '1',
                asserts: { status: 401 },
                body: ['EXPECTED', getValidTagBody()],
            });
        });

        await test.step("Empty token", async () =>
        {
            await createPostTxnTagFunc()(
            {
                token: '',
                asserts: { status: 401 },
                body: ['EXPECTED', getValidTagBody()],
            });
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});


Deno.test(
{
    name: "Allow valid non-repeating tags",
    async fn(test)
    {
        const testUserToken = await beforeEachSetup(test);

        await test.step("Creating first tag", async () =>
        {
            await createPostTxnTagFunc()(
            {
                token: testUserToken!,
                asserts: 'default',
                body: ['EXPECTED', getValidTagBody()],
            });
        });

        await test.step("Creating second tag with same name", async () =>
        {
            await createPostTxnTagFunc()(
            {
                token: testUserToken!,
                asserts: { status: 400 },
                body: ['EXPECTED', getValidTagBody()],
            });
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});


Deno.test(
{
    name: "Able to get added tags with valid creds",
    async fn(test)
    {
        const testUserToken = await beforeEachSetup(test);

        await test.step("Creating first tag", async () =>
        {
            await createPostTxnTagFunc()(
            {
                token: testUserToken!,
                asserts: 'default',
                body: ['EXPECTED', getValidTagBody()],
            });
        });

        await test.step("Getting the posted tag without tokens", async () =>
        {
            await createGetTxnTagsFunc()(
            {
                token: '',
                asserts: { status: 401 }
            });
        });

        await test.step("Getting the posted tag", async () =>
        {
            const tagRes = await createGetTxnTagsFunc()(
            {
                token: testUserToken!,
                asserts: 'default'
            });

            assertEqual(tagRes.parsedBody!.rangeItems.length, 1);
            assertEqual(tagRes.parsedBody!.rangeItems[0].name, getValidTagBody().name);
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});