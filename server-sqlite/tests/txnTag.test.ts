import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { assertJSONEqual, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { Generator } from "./shortcuts/generator.js";
import { GetTxnTagsAPI, PostTxnTagsAPI, TxnTagsDTO } from "../../api-types/txnTag.js";
import { Type } from "class-transformer";
import { AuthHelpers } from "./auth.test.js";

export class TransactionTagsDTOClass implements TxnTagsDTO
{
    @IsString() id: string;
    @IsString() owner: string;
    @IsString() name: string;
}

export namespace GetTxnTagsAPIClass
{
    export class ResponseDTOClass implements GetTxnTagsAPI.ResponseDTO
    {
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => TransactionTagsDTOClass)
        rangeItems: TransactionTagsDTOClass[];
    }
}

// This class is to add validation decorators to the api-types defined
export class ResponsePostTxnTagsDTOBody extends TransactionTagsDTOClass {}

const createPostTxnTypeBody = (name: string) => ({ "name": name });

export default async function(this: Context)
{
    await resetDatabase();

    await this.module("Txn Tags", async function()
    {
        await this.module(UnitTestEndpoints.transactionTagsEndpoints['get'], async function()
        {
            const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const { username:firstUserName, token:firstUserToken } = Object.values(userCreds)[0];
            const baseValidObj = createPostTxnTypeBody(`TESTING TXN TAG`);
            let postedTxnTag = undefined as undefined | ResponsePostTxnTagsDTOBody;

            await this.describe(`post`, async function()
            {
                await this.test(`Forbid creating txn tags without token`, async function()
                {
                    await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTagsEndpoints['post'],
                    {
                        baseURL: serverURL, expectedStatus: 401, method: "POST",
                        body: baseValidObj
                    });
                });

                for (const testCase of BodyGenerator.enumerateMissingField(baseValidObj))
                {
                    await this.test(`Forbid creating txn tags without ${testCase.fieldMissed}`, async function()
                    {
                        await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTagsEndpoints['post'],
                        {
                            baseURL: serverURL, expectedStatus: 400, method: "POST",
                            body: testCase.obj,
                            headers: { "authorization": firstUserToken }
                        });
                    });
                }

                await this.test(`Allow creating txn tags with valid body`, async function()
                {
                    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTagsEndpoints['post'],
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
                    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTagsEndpoints['get'],
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

export namespace TxnTagHelpers
{
    export async function postCreateTxnTag(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostTxnTagsAPI.RequestDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTagsEndpoints['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? ResponsePostTxnTagsDTOBody : undefined
        });
        return {
            ...response,
            txnTagId: response.parsedBody?.id as string | undefined
        };
    }

    /** Random tnx tags with unique names */
    export async function postRandomTxnTags(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        txnCount: number
    })
    {
        const usedNames: string[] = [];
        const output: { txnId: string, txnName: string }[] = [];
        for (let i = 0; i < config.txnCount; i++)
        {
            const randomName = Generator.randUniqueName(usedNames);
            usedNames.push(randomName);
            output.push(
            {
                txnId: (await TxnTagHelpers.postCreateTxnTag(
                {
                    body         : { name: randomName },
                    serverURL    : config.serverURL,
                    token        : config.token,
                    assertBody   : config.assertBody,
                    expectedCode : config.expectedCode
                })).txnTagId,
                txnName: randomName
            });
        }
        return output;
    }
}