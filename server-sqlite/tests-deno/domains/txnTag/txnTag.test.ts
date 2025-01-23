/// <reference lib="deno.ns" />

import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, getTestServerPath, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { POST_TXN_TAGS_API_PATH, GET_TXN_TAGS_API_PATH } from './paths.ts';
import { GetTxnTagsAPIClass, TransactionTagsDTOClass } from "./classes.ts";
import { assertEqual } from '../../../tests/lib/assert.ts';

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

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
            {
                assertStatus: 400, method: "POST",
                headers: { 'authorization': testUserToken! },
                body: {  },
                expectedBodyType: TransactionTagsDTOClass
            }
        );
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

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
            {
                assertStatus: 400, method: "POST",
                headers: { 'authorization': testUserToken! },
                body: { name: [] },
                expectedBodyType: TransactionTagsDTOClass
            }
        );

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
            {
                assertStatus: 400, method: "POST",
                headers: { 'authorization': testUserToken! },
                body: { name: {} },
                expectedBodyType: TransactionTagsDTOClass
            }
        );

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
            {
                assertStatus: 400, method: "POST",
                headers: { 'authorization': testUserToken! },
                body: { name: 12312 },
                expectedBodyType: TransactionTagsDTOClass
            }
        );
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

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
            {
                assertStatus: 401, method: "POST",
                headers: { 'authorization': testUserToken + '1' },
                body: getValidTagBody(),
                expectedBodyType: TransactionTagsDTOClass
            }
        );

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
            {
                assertStatus: 401, method: "POST",
                headers: { },
                body: getValidTagBody(),
                expectedBodyType: TransactionTagsDTOClass
            }
        );
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
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
                {
                    assertStatus: 200, method: "POST",
                    headers: { 'authorization': testUserToken! },
                    body: getValidTagBody(),
                    expectedBodyType: TransactionTagsDTOClass
                }
            );
        });

        await test.step("Creating second tag with same name", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    headers: { 'authorization': testUserToken! },
                    body: getValidTagBody(),
                    expectedBodyType: TransactionTagsDTOClass
                }
            );
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
            await assertFetchJSON
            (
                path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
                {
                    assertStatus: 200, method: "POST",
                    headers: { 'authorization': testUserToken! },
                    body: getValidTagBody(),
                    expectedBodyType: TransactionTagsDTOClass
                }
            );
        });

        await test.step("Getting the posted tag without tokens", async () =>
        {
            await assertFetchJSON
            (
                path.join(getTestServerPath(), GET_TXN_TAGS_API_PATH),
                {
                    assertStatus: 401, method: "GET",
                    headers: { },
                    expectedBodyType: GetTxnTagsAPIClass.ResponseDTOClass
                }
            );
        });

        await test.step("Getting the posted tag", async () =>
        {
            const tagRes = await assertFetchJSON
            (
                path.join(getTestServerPath(), GET_TXN_TAGS_API_PATH),
                {
                    assertStatus: 200, method: "GET",
                    headers: { 'authorization': testUserToken! },
                    expectedBodyType: GetTxnTagsAPIClass.ResponseDTOClass
                }
            );

            assertEqual(tagRes.parsedBody!.rangeItems.length, 1);
            assertEqual(tagRes.parsedBody!.rangeItems[0].name, getValidTagBody().name);
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});