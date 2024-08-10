import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { assertJSONEqual, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { HookShortcuts } from "./shortcuts/hookShortcuts.js";
import { ResponseGetTransactionTypesDTO, ResponsePostTransactionTypesDTO, TransactionTypesDTO } from "../../api-types/txnType.js";
import { Type } from "class-transformer";

export class TransactionTypesDTOClass implements TransactionTypesDTO
{
    @IsString() id: string;
    @IsString() owner: string;
    @IsString() name: string;
}

export class ResponseGetTransactionTypesDTOBody implements ResponseGetTransactionTypesDTO
{
    @IsNumber() totalItems: number;
    @IsNumber() startingIndex: number;
    @IsNumber() endingIndex: number;
    
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TransactionTypesDTOClass)
    rangeItems: TransactionTypesDTO[];
}

// This class is to add validation decorators to the api-types defined
export class ResponsePostTransactionTypesDTOBody extends TransactionTypesDTOClass {}

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

            let postedTxnType = undefined as undefined | ResponsePostTransactionTypesDTOBody;
            await this.test(`Allow creating txn types with valid body`, async function()
            {
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['post'], 
                {
                    baseURL: serverURL, expectedStatus: 200, method: "POST",
                    headers: { "authorization": firstUserToken },
                    body: baseValidObj,
                    expectedBodyType: ResponsePostTransactionTypesDTOBody
                });
                postedTxnType = response.parsedBody;
            });

            await this.test(`Check for missing props on posted types`, async function()
            {
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['get'], 
                {
                    baseURL: serverURL, expectedStatus: 200, method: "GET",
                    headers: { "authorization": firstUserToken },
                    expectedBodyType: ResponseGetTransactionTypesDTOBody
                });
                assertStrictEqual(response.parsedBody.rangeItems.length, 1);
                assertJSONEqual(response.parsedBody.rangeItems[0], postedTxnType);
            });
        });
    });
}