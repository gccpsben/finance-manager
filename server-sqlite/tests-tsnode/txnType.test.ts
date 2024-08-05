import { IsString } from "class-validator";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { HookShortcuts } from "./shortcuts/hookShortcuts.js";
import { ResponsePostTransactionTypesDTO } from "../../api-types/txnType.js";

export class ResponsePostTransactionTypesDTOBody implements ResponsePostTransactionTypesDTO // This class is to add validation decorators to the api-types defined
{
    @IsString() id: string;
    @IsString() owner: string;
    @IsString() name: string;
}

const createPostTxnTypeBody = (name: string) => ({ "name": name });

export default async function(this: Context)
{
    await resetDatabase();

    await this.describe("Txn Types", async function()
    {
        await this.describe(`Get/Create Txn Types`, async function()
        {
            const userCreds = await HookShortcuts.registerRandMockUsers(serverURL, 1);
            const { username:firstUserName, token:firstUserToken } = Object.values(userCreds)[0];
            const baseValidObj = createPostTxnTypeBody(`TESTING TXN TYPE`);

            await this.test(`Forbid creating txn types without token`, async function()
            {
                await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['post'], 
                {
                    baseURL: serverURL, expectedStatus: 401, method: "POST",
                    body: baseValidObj
                });
            });

            for (const testCase of BodyGenerator.enumerateMissingField(baseValidObj))
            {
                await this.test(`Forbid creating txn types without ${testCase.fieldMissed}`, async function()
                {
                    await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['post'], 
                    {
                        baseURL: serverURL, expectedStatus: 400, method: "POST",
                        body: testCase.obj,
                        headers: { "authorization": firstUserToken }
                    });
                });
            }

            await this.test(`Allow creating txn types with valid body`, async function()
            {
                await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['post'], 
                {
                    baseURL: serverURL, expectedStatus: 200, method: "POST",
                    headers: { "authorization": firstUserToken },
                    body: baseValidObj,
                    expectedBodyType: ResponsePostTransactionTypesDTOBody
                });
            });
        });
    });
}