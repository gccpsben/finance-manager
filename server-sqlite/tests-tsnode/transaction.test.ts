import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { HookShortcuts } from "./shortcuts/hookShortcuts.js";
import { IsString, IsNotEmpty, IsOptional, IsDateString } from "class-validator";
import { IsDecimalJSString, IsUTCDateInt } from "../server_source/db/validators.js";
import { simpleFaker } from "@faker-js/faker";
import { PostTxnAPI } from "../../api-types/txn.js";
import { PostContainerAPIClass } from "./container.test.js";
import { PostCurrencyAPIClass } from "./currency.test.js";

export namespace PostTxnAPIClass
{
    export class RequestDTOClass implements PostTxnAPI.RequestDTO
    { 
        @IsString() @IsNotEmpty() title: string; 
        @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
        @IsOptional() @IsString() description?: string | undefined;
        @IsString() typeId: string;
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

const createPostTxnTypeBody = (name: string) => ({ "name": name });
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
    await this.describe("Transactions", async function()
    {
        await testFromTransactions.bind(this)();
    });
}

async function testFromTransactions(this: Context)
{
    await this.describe(`Create Transactions (from)`, async function()
    {
        await resetDatabase();
        
        const testUsersCreds = await HookShortcuts.registerRandMockUsers(serverURL, 1);
        const firstUser = Object.values(testUsersCreds)[0];
        const testContext = 
        {
            baseCurrId:  undefined as undefined | string,
            secCurrId: undefined as undefined | string,
            secCurrAmountToBase: "7.1",
            containerId: undefined as undefined | string,
            txnTypeId: undefined as undefined | string
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

        // Register txn type for first user
        await (async function()
        {
            const response = await HookShortcuts.postCreateTxnType(
            {
                serverURL: serverURL,
                body: { name: `TxnType1` },
                token: firstUser.token,
                assertBody: true
            });
            testContext.txnTypeId = response.parsedBody.id;
        }).bind(this)();

        const baseObj = 
        {
            ...getRandTxnBaseBody(),
            fromAmount: "200",
            fromContainerId: testContext.containerId,
            fromCurrencyId: testContext.baseCurrId,
            typeId: testContext.txnTypeId
        } satisfies PostTxnAPIClass.RequestDTOClass;

        for (const testCase of BodyGenerator.enumerateMissingField(baseObj, ["description", "creationDate"]))
        {
            await this.test(`Forbid creating transactions without ${testCase.fieldMissed} but all other fields`, async function()
            {
                await HookShortcuts.postCreateTransaction(
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
            await HookShortcuts.postCreateTransaction(
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
            await HookShortcuts.postCreateTransaction(
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
            await HookShortcuts.postCreateTransaction(
            {
                serverURL: serverURL,
                body: baseObj,
                token: firstUser.token,
                assertBody: true,
                expectedCode: 200
            });
        });
    });
}