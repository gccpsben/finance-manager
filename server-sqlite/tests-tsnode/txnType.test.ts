import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { assertJSONEqual, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { HookShortcuts } from "./shortcuts/hookShortcuts.js";
import { GetTxnTypesAPI, TxnTypesDTO } from "../../api-types/txnType.js";
import { Type } from "class-transformer";

export class TransactionTypesDTOClass implements TxnTypesDTO
{
    @IsString() id: string;
    @IsString() owner: string;
    @IsString() name: string;
}

export namespace GetTxnTypesAPIClass
{
    export class ResponseDTOClass implements GetTxnTypesAPI.ResponseDTO
    {
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;
        
        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => TransactionTypesDTOClass)
        rangeItems: TransactionTypesDTOClass[];
    }
}

// This class is to add validation decorators to the api-types defined
export class ResponsePostTransactionTypesDTOBody extends TransactionTypesDTOClass {}

const createPostTxnTypeBody = (name: string) => ({ "name": name });

export default async function(this: Context)
{
    await resetDatabase();

    await this.describe("Txn Types", async function()
    {
        await this.describe(UnitTestEndpoints.transactionTypesEndpoints['get'], async function()
        {
            const userCreds = await HookShortcuts.registerRandMockUsers(serverURL, 1);
            const { username:firstUserName, token:firstUserToken } = Object.values(userCreds)[0];
            const baseValidObj = createPostTxnTypeBody(`TESTING TXN TYPE`);
            let postedTxnType = undefined as undefined | ResponsePostTransactionTypesDTOBody;

            await this.describe(`post`, async function()
            {   
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
                    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['post'], 
                    {
                        baseURL: serverURL, expectedStatus: 200, method: "POST",
                        headers: { "authorization": firstUserToken },
                        body: baseValidObj,
                        expectedBodyType: ResponsePostTransactionTypesDTOBody
                    });
                    postedTxnType = response.parsedBody;
                });    
            });

            await this.describe(`get`, async function()
            {
                await this.test(`Check for missing props on posted types`, async function()
                {
                    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['get'], 
                    {
                        baseURL: serverURL, expectedStatus: 200, method: "GET",
                        headers: { "authorization": firstUserToken },
                        expectedBodyType: GetTxnTypesAPIClass.ResponseDTOClass
                    });
                    assertStrictEqual(response.parsedBody.rangeItems.length, 1);
                    assertJSONEqual(response.parsedBody.rangeItems[0], postedTxnType);
                });
            });
        })
    });
}