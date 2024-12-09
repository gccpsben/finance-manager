import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { AssertFetchReturns, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber } from "class-validator";
import { IsDecimalJSString, IsUTCDateInt } from "../server_source/db/validators.js";
import { simpleFaker } from "@faker-js/faker";
import { GetTxnAPI, PostTxnAPI, PutTxnAPI } from "../../api-types/txn.js";
import { PostContainerAPIClass } from "./container.test.js";
import { PostCurrencyAPIClass } from "./currency.test.js";
import { Type } from "class-transformer";
import { AuthHelpers } from "./auth.test.js";
import { TxnTagHelpers } from "./txnTag.test.js";

export namespace GetTxnAPIClass
{
    export class TxnDTOClass implements GetTxnAPI.TxnDTO
    {
        @IsString() id: string;
        @IsString() title: string;
        @IsOptional() @IsString() description: string;
        @IsString() owner: string;
        @IsOptional() @IsUTCDateInt()  creationDate: number;
        @IsString() txnTag: string;
        @IsOptional() @IsDecimalJSString() fromAmount: string;
        @IsOptional() @IsString() fromCurrency: string;
        @IsOptional() @IsString() fromContainer: string;
        @IsOptional() @IsDecimalJSString() toAmount: string;
        @IsOptional() @IsString() toCurrency: string;
        @IsOptional() @IsString() toContainer: string;
    }

    export class ResponseDTOClass implements GetTxnAPI.ResponseDTO
    {
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => TxnDTOClass)
        rangeItems: GetTxnAPI.TxnDTO[];
    }
}

export namespace PostTxnAPIClass
{
    export class RequestDTOClass implements PostTxnAPI.RequestDTO
    {
        @IsString() @IsNotEmpty() title: string;
        @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
        @IsOptional() @IsString() description?: string | undefined;
        @IsString() txnTagId: string;
        @IsOptional() @IsDecimalJSString() fromAmount?: string | undefined;
        @IsOptional() @IsString() fromContainerId?: string | undefined;
        @IsOptional() @IsString() fromCurrencyId?: string | undefined;
        @IsOptional() @IsDecimalJSString() toAmount?: string | undefined;
        @IsOptional() @IsString() toContainerId?: string | undefined;
        @IsOptional() @IsString() toCurrencyId?: string | undefined;
    }

    export class ResponseDTOClass implements PostTxnAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

export namespace PutTxnAPIClass
{
    export class RequestBodyDTOClass implements PutTxnAPI.RequestBodyDTO
    {
        @IsString() @IsNotEmpty() title: string;
        @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
        @IsOptional() @IsString() description?: string | undefined;
        @IsString() txnTagId: string;
        @IsOptional() @IsDecimalJSString() fromAmount?: string | undefined;
        @IsOptional() @IsString() fromContainerId?: string | undefined;
        @IsOptional() @IsString() fromCurrencyId?: string | undefined;
        @IsOptional() @IsDecimalJSString() toAmount?: string | undefined;
        @IsOptional() @IsString() toContainerId?: string | undefined;
        @IsOptional() @IsString() toCurrencyId?: string | undefined;
    }

    export class RequestQueryDTOClass implements PutTxnAPI.RequestQueryDTO
    {
        @IsString() targetTxnId: string;
    }
}

const createPostContainerBody = (name: string) => ({name: name});
const createBaseCurrencyPostBody = (name: string, ticker: string) => ({ name: name, ticker: ticker });
const createCurrencyPostBody = (name: string, ticker: string, fallbackRateCurrencyId: string, fallbackRateAmount: string) =>
(
    {
        name: name,
        ticker: ticker,
        fallbackRateCurrencyId: fallbackRateCurrencyId,
        fallbackRateAmount: fallbackRateAmount
    } satisfies  PostCurrencyAPIClass.RequestDTO
);

function getRandTxnBaseBody()
{
    return {
        title: simpleFaker.string.sample(),
        creationDate: simpleFaker.date.anytime().getTime(),
        description: simpleFaker.string.sample(),
    };
}

export default async function(this: Context)
{
    await this.module("Transactions", async function()
    {
        await this.module(UnitTestEndpoints.transactionsEndpoints['get'], async function()
        {
            await resetDatabase();

            const testUsersCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const firstUser = Object.values(testUsersCreds)[0];
            const testContext =
            {
                baseCurrId:  undefined as undefined | string,
                secCurrId: undefined as undefined | string,
                secCurrAmountToBase: "7.1",
                containerId: undefined as undefined | string,
                txnTagId: undefined as undefined | string
            };

            // Register base currency for first user
            await (async function()
            {
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'],
                {
                    baseURL: serverURL, expectedStatus: 200, method: "POST",
                    body: createBaseCurrencyPostBody(`User-Currency`, `USER-TICKER`),
                    headers: { "authorization": firstUser.token },
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                });
                testContext.baseCurrId = response.parsedBody.id;
            }).bind(this)();

            // Register secondary currency for first user
            await (async function()
            {
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'],
                {
                    baseURL: serverURL, expectedStatus: 200, method: "POST",
                    body: createCurrencyPostBody(`User-Currency2`, `USER-TICKER2`, testContext.baseCurrId, testContext.secCurrAmountToBase),
                    headers: { "authorization": firstUser.token },
                    expectedBodyType: PostCurrencyAPIClass.ResponseDTO
                });
                testContext.secCurrId = response.parsedBody.id;
            }).bind(this)();

            // Register container for first user
            await (async function()
            {
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints['post'],
                {
                    baseURL: serverURL, expectedStatus: 200, method: "POST",
                    body: createPostContainerBody(`Container1`),
                    headers: { "authorization": firstUser.token },
                    expectedBodyType: PostContainerAPIClass.ResponseDTO
                });
                testContext.containerId = response.parsedBody.id;
            }).bind(this)();

            // Register txn tag for first user
            await (async function()
            {
                const response = await TxnTagHelpers.postCreateTxnTag(
                {
                    serverURL: serverURL,
                    body: { name: `TxnType1` },
                    token: firstUser.token,
                    assertBody: true
                });
                testContext.txnTagId = response.parsedBody.id;
            }).bind(this)();

            await this.describe(`post`, async function()
            {
                const baseObj =
                {
                    ...getRandTxnBaseBody(),
                    fromAmount: "200",
                    fromContainerId: testContext.containerId,
                    fromCurrencyId: testContext.baseCurrId,
                    txnTagId: testContext.txnTagId
                } satisfies PostTxnAPIClass.RequestDTOClass;

                for (const testCase of BodyGenerator.enumerateMissingField(baseObj, ["description", "creationDate"]))
                {
                    await this.test(`Forbid creating transactions without ${testCase.fieldMissed} but all other fields`, async function()
                    {
                        await TransactionHelpers.postCreateTransaction(
                        {
                            serverURL: serverURL,
                            body: { ...testCase.obj },
                            token: firstUser.token,
                            assertBody: false,
                            expectedCode: 400
                        });
                    });
                }

                await this.test(`Allow creating transactions without description`, async function()
                {
                    await TransactionHelpers.postCreateTransaction(
                    {
                       serverURL: serverURL,
                       body: { ...baseObj, description: undefined },
                       token: firstUser.token,
                       assertBody: true,
                       expectedCode: 200
                    });
                });

                await this.test(`Allow creating transactions without creationDate`, async function()
                {
                    await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL,
                        body: { ...baseObj, creationDate: undefined },
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200
                    });
                });

                await this.test(`Allow creating transactions with valid body and token`, async function()
                {
                    await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL,
                        body: baseObj,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200
                    });
                });
            });

            await this.describe(`get & put`, async function()
            {
                const randTxnBaseBody = getRandTxnBaseBody();
                let createdTxnId = undefined as undefined | string;

                await this.test(`Creating txn with valid body and token`, async function()
                {
                    const baseObj =
                    {
                        ...randTxnBaseBody,
                        fromAmount: "200",
                        fromContainerId: testContext.containerId,
                        fromCurrencyId: testContext.baseCurrId,
                        toAmount: "200",
                        toContainerId: testContext.containerId,
                        toCurrencyId: testContext.baseCurrId,
                        txnTagId: testContext.txnTagId
                    } satisfies PostTxnAPIClass.RequestDTOClass;

                    const createdTxn = await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL,
                        body: baseObj,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200
                    });

                    createdTxnId = createdTxn.parsedBody.id;
                });

                let txnCreated: AssertFetchReturns<GetTxnAPI.ResponseDTO>;
                await this.test(`Getting the posted txn`, async function()
                {
                    txnCreated = await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200,
                        id: createdTxnId
                    });

                    assertStrictEqual(txnCreated.parsedBody.rangeItems.length, 1);
                    assertStrictEqual(txnCreated.parsedBody.rangeItems[0].id, createdTxnId);
                    assertStrictEqual(txnCreated.parsedBody.rangeItems[0].title, randTxnBaseBody.title);
                });

                await this.test(`Updating existing txn`, async function()
                {
                    await TransactionHelpers.putTransaction(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        expectedCode: 200,
                        targetTxnId: createdTxnId,
                        body:
                        {
                            fromAmount: "171",
                            fromContainerId: testContext.containerId,
                            fromCurrencyId: testContext.baseCurrId,
                            toAmount: undefined,
                            toContainerId: undefined,
                            toCurrencyId: undefined,
                            txnTagId: testContext.txnTagId,
                            creationDate: txnCreated.parsedBody.rangeItems[0].creationDate,
                            description: "changed desc",
                            title: "changed title",
                        }
                    });

                    const txnAfterMutated = await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200,
                        id: createdTxnId
                    });

                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].id, createdTxnId);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fromAmount, "171");
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fromContainer, testContext.containerId);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fromCurrency, testContext.baseCurrId);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].toAmount, null);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].toContainer, null);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].toCurrency, null);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].txnTag, testContext.txnTagId);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].creationDate, txnCreated.parsedBody.rangeItems[0].creationDate);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].description, "changed desc");
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].title, "changed title");
                })
            })
        });
    });
}

export namespace TransactionHelpers
{
    export async function getTransaction(config:
    {
        serverURL: string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        start?: number,
        end?: number,
        id?: string
    })
    {
        const searchParams: Record<any,any> = {  };
        if (config.start !== undefined && config.start !== null) searchParams['start'] = config.start;
        if (config.end !== undefined && config.end !== null) searchParams['end'] = config.end;
        if (config.id !== undefined && config.id !== null) searchParams['id'] = config.id;

        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.transactionsEndpoints['get']}?${new URLSearchParams(searchParams).toString()}`,
            {
                baseURL: `${config.serverURL}`,
                expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetTxnAPIClass.ResponseDTOClass : undefined
            }
        );
        const output = response;
        return output as AssertFetchReturns<GetTxnAPI.ResponseDTO>;
    }

    export async function putTransaction(config:
    {
        serverURL: string,
        token:string,
        body: Partial<PutTxnAPI.RequestBodyDTO>,
        targetTxnId: string,
        expectedCode?: number,
    })
    {
        const queryObj = { targetTxnId: config.targetTxnId } satisfies PutTxnAPI.RequestQueryDTO;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.transactionsEndpoints['put']}?${new URLSearchParams(queryObj).toString()}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "PUT",
                body: config.body,
                headers: { "authorization": config.token },
            }
        );
        return response as AssertFetchReturns<{}>;
    }

    export async function postCreateTransaction(config:
    {
        serverURL: string,
        token:string,
        body: Partial<PostTxnAPIClass.RequestDTOClass>,
        assertBody?: boolean,
        expectedCode?: number,
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionsEndpoints['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? PostTxnAPIClass.ResponseDTOClass : undefined
        });
        const output =
        {
            ...response,
            txnId: response.parsedBody?.id as string | undefined
        };
        return output as AssertFetchReturns<PostTxnAPIClass.ResponseDTOClass> & { txnId?: string | undefined };
    }
}