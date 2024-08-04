import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { HookShortcuts } from "./lib/hookShortcuts.js";
import { IsString, IsNotEmpty, IsOptional, IsDateString } from "class-validator";
import { IsDecimalJSString } from "../server_source/db/validators.js";
import { simpleFaker } from "@faker-js/faker";
import { PostTransactionDTO, ResponsePostTransactionDTO } from "../../api-types/txn.js";
import { ResponsePostTransactionTypesDTOBody } from "./txnType.test.js";
import { ResponsePostCurrencyDTOClass } from "./currency.test.js";
import { ResponsePostContainerDTOBody } from "./container.test.js";

export class PostTransactionDTOBody implements PostTransactionDTO
{ 
    @IsString() @IsNotEmpty() title: string; 
    @IsOptional() @IsDateString() creationDate?: string | undefined;
    @IsOptional() @IsString() description?: string | undefined;
    @IsString() typeId: string;
    @IsOptional() @IsDecimalJSString() fromAmount?: string | undefined;
    @IsOptional() @IsString() fromContainerId?: string | undefined;
    @IsOptional() @IsString() fromCurrencyId?: string | undefined;
    @IsOptional() @IsDecimalJSString() toAmount?: string | undefined;
    @IsOptional() @IsString() toContainerId?: string | undefined;
    @IsOptional() @IsString() toCurrencyId?: string | undefined;
}

export class ResponsePostTransactionDTOBody implements ResponsePostTransactionDTO
{
    @IsString() id: string;
}

const createPostTxnTypeBody = (name: string) => ({ "name": name });
const createPostContainerBody = (name: string) => ({name: name});
const createBaseCurrencyPostBody = (name: string, ticker: string) => ({ name: name, ticker: ticker });
const createCurrencyPostBody = (name: string, ticker: string, refCurrencyId: string, amount: string) => ({ name: name, ticker: ticker, refCurrencyId: refCurrencyId, amount: amount });

function getRandTxnBaseBody()
{
    return {
        title: simpleFaker.string.sample(),
        creationDate: simpleFaker.date.anytime().toISOString(),
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
            class expectedType { @IsString() id: string; }
            const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 200, method: "POST",
                body: createBaseCurrencyPostBody(`User-Currency`, `USER-TICKER`),
                headers: { "authorization": firstUser.token },
                expectedBodyType: ResponsePostCurrencyDTOClass
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
                expectedBodyType: ResponsePostCurrencyDTOClass
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
                expectedBodyType: ResponsePostContainerDTOBody
            });
            testContext.containerId = response.parsedBody.id;
        }).bind(this)();

        // Register txn type for first user
        await (async function()
        {
            const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 200, method: "POST",
                body: createPostTxnTypeBody(`TxnTyp1`),
                headers: { "authorization": firstUser.token },
                expectedBodyType: ResponsePostTransactionTypesDTOBody
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
        } satisfies PostTransactionDTOBody;

        for (const testCase of BodyGenerator.enumerateMissingField(baseObj, ["description", "creationDate"]))
        {
            await this.test(`Forbid creating transactions without ${testCase.fieldMissed} but all other fields`, async function()
            {
                await HTTPAssert.assertFetch(UnitTestEndpoints.transactionsEndpoints['post'], 
                {
                    baseURL: serverURL, expectedStatus: 400, method: "POST",
                    body: testCase.obj,
                    headers: { "authorization": firstUser.token }
                });
            });
        }

        await this.test(`Allow creating transactions without description`, async function()
        {
            await HTTPAssert.assertFetch(UnitTestEndpoints.transactionsEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 200, method: "POST",
                body: { ...baseObj, description: undefined } satisfies PostTransactionDTOBody,
                headers: { "authorization": firstUser.token },
                expectedBodyType: ResponsePostTransactionDTOBody
            });
        });

        await this.test(`Allow creating transactions without creationDate`, async function()
        {
            await HTTPAssert.assertFetch(UnitTestEndpoints.transactionsEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 200, method: "POST",
                body: { ...baseObj, creationDate: undefined } satisfies PostTransactionDTOBody,
                headers: { "authorization": firstUser.token },
                expectedBodyType: ResponsePostTransactionDTOBody
            });
        });

        await this.test(`Allow creating transactions with valid body and token`, async function()
        {
            await HTTPAssert.assertFetch(UnitTestEndpoints.transactionsEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 200, method: "POST",
                body: { ...baseObj } satisfies PostTransactionDTOBody,
                headers: { "authorization": firstUser.token },
                expectedBodyType: ResponsePostTransactionDTOBody
            });
        });
    });
}