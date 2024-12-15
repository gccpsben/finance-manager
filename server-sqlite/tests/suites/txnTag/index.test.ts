import { BodyGenerator } from "../../lib/bodyGenerator.js";
import { resetDatabase, serverURL, TESTS_ENDPOINTS } from "../../index.test.js";
import { assertJSONEqual, assertStrictEqual, HTTPAssert } from "../../lib/assert.js";
import { Context } from "../../lib/context.js";
import { AuthHelpers } from "../auth/helpers.js";
import { GetTxnTagsAPIClass, ResponsePostTxnTagsDTOBody } from "./classes.js";


const createPostTxnTypeBody = (name: string) => ({ "name": name });

export default async function(this: Context)
{
    await resetDatabase();

    await this.module("Txn Tags", async function()
    {
        await this.module(TESTS_ENDPOINTS['transactionTags']['get'], async function()
        {
            const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const { username:firstUserName, token:firstUserToken } = Object.values(userCreds)[0];
            const baseValidObj = createPostTxnTypeBody(`TESTING TXN TAG`);
            let postedTxnTag = undefined as undefined | ResponsePostTxnTagsDTOBody;

            await this.describe(`post`, async function()
            {
                await this.test(`Forbid creating txn tags without token`, async function()
                {
                    await HTTPAssert.assertFetch(TESTS_ENDPOINTS['transactionTags']['post'],
                    {
                        baseURL: serverURL, expectedStatus: 401, method: "POST",
                        body: baseValidObj
                    });
                });

                for (const testCase of BodyGenerator.enumerateMissingField(baseValidObj))
                {
                    await this.test(`Forbid creating txn tags without ${testCase.fieldMissed}`, async function()
                    {
                        await HTTPAssert.assertFetch(TESTS_ENDPOINTS['transactionTags']['post'],
                        {
                            baseURL: serverURL, expectedStatus: 400, method: "POST",
                            body: testCase.obj,
                            headers: { "authorization": firstUserToken }
                        });
                    });
                }

                await this.test(`Allow creating txn tags with valid body`, async function()
                {
                    const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['transactionTags']['post'],
                    {
                        baseURL: serverURL, expectedStatus: 200, method: "POST",
                        headers: { "authorization": firstUserToken },
                        body: baseValidObj,
                        expectedBodyType: ResponsePostTxnTagsDTOBody
                    });
                    postedTxnTag = response.parsedBody;
                });
            });

            await this.describe(`get`, async function()
            {
                await this.test(`Check for missing props on posted tags`, async function()
                {
                    const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['transactionTags']['get'],
                    {
                        baseURL: serverURL, expectedStatus: 200, method: "GET",
                        headers: { "authorization": firstUserToken },
                        expectedBodyType: GetTxnTagsAPIClass.ResponseDTOClass
                    });
                    assertStrictEqual(response.parsedBody.rangeItems.length, 1);
                    assertJSONEqual(response.parsedBody.rangeItems[0], postedTxnTag);
                });
            });
        })
    });
}