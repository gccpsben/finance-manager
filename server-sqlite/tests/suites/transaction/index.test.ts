import { resetDatabase, serverURL, UnitTestEndpoints } from "../../index.test.js";
import { AssertFetchReturns, assertStrictEqual, HTTPAssert } from "../../lib/assert.js";
import { Context } from "../../lib/context.js";
import { BodyGenerator } from "../../lib/bodyGenerator.js";
import { simpleFaker } from "@faker-js/faker";
import { GetTxnAPI } from "../../../../api-types/txn.js";
import { PostCurrencyAPIClass } from "../currency/classes.js";
import { AuthHelpers } from "../auth/helpers.js";
import { PostContainerAPIClass } from "../container/classes.js";
import { PostTxnAPIClass } from "./classes.js";
import { TransactionHelpers } from "./helpers.js";
import { TxnTagHelpers } from "../txnTag/helpers.js";

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
                txnTagId1: undefined as undefined | string,
                txnTagId2: undefined as undefined | string
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
                testContext.txnTagId1 = response.parsedBody.id;
            }).bind(this)();

            // Register txn tag for first user
            await (async function()
            {
                const response = await TxnTagHelpers.postCreateTxnTag(
                {
                    serverURL: serverURL,
                    body: { name: `TxnType2` },
                    token: firstUser.token,
                    assertBody: true
                });
                testContext.txnTagId2 = response.parsedBody.id;
            }).bind(this)();

            await this.describe(`post`, async function()
            {
                const baseObj =
                {
                    ...getRandTxnBaseBody(),
                    fromAmount: "200",
                    fromContainerId: testContext.containerId,
                    fromCurrencyId: testContext.baseCurrId,
                    tagIds: [testContext.txnTagId1]
                } satisfies PostTxnAPIClass.RequestItemDTOClass;

                for (const testCase of BodyGenerator.enumerateMissingField(baseObj, ["description", "creationDate"]))
                {
                    await this.test(`Forbid creating transactions without ${testCase.fieldMissed} but all other fields`, async function()
                    {
                        await TransactionHelpers.postCreateTransaction(
                        {
                            serverURL: serverURL,
                            // @ts-expect-error
                            body: { transactions: [ testCase.obj ] },
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
                       body: { transactions: [ { ...baseObj, description: undefined } ] },
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
                        body: { transactions: [ { ...baseObj, creationDate: undefined } ] },
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200
                    });
                });

                await this.test(`Allow creating transactions with valid body and token`, async function()
                {
                    await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL, body: { transactions: [ baseObj ] },
                        token: firstUser.token, assertBody: true, expectedCode: 200
                    });
                });

                await this.test(`Allow creating transactions in batch with valid body and token`, async function()
                {
                    const allTxnBeforeBatchPOST = await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL, token: firstUser.token,
                        assertBody: true, expectedCode: 200,
                    });

                    const response = await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL, body: { transactions: [ baseObj, baseObj, baseObj ] },
                        token: firstUser.token, assertBody: true, expectedCode: 200
                    });

                    const allTxnAfterBatchPOST = await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL, token: firstUser.token,
                        assertBody: true, expectedCode: 200,
                    });

                    // Assert that extra 3 txns are added
                    assertStrictEqual(allTxnAfterBatchPOST.parsedBody.rangeItems.length - allTxnBeforeBatchPOST.parsedBody.rangeItems.length, 3);
                });

                await this.test(`Test if transactional query is working in creating txns in batch `, async function()
                {
                    const txnCountBeforeBatchPOST = (await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL, token: firstUser.token,
                        assertBody: true, expectedCode: 200,
                    })).parsedBody.rangeItems.length;

                    await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL,token: firstUser.token, assertBody: false, expectedCode: 400,
                        body:
                        {
                            transactions:
                            [
                                baseObj,
                                baseObj,
                                {
                                    ...baseObj,
                                    // @ts-expect-error
                                    creationDate: "this value should fail validations"
                                }
                            ]
                        }
                    });

                    const txnCountAfterBatchPOST = (await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL, token: firstUser.token,
                        assertBody: true, expectedCode: 200,
                    })).parsedBody.rangeItems.length;

                    // Assert that no txns are added
                    assertStrictEqual(txnCountBeforeBatchPOST - txnCountAfterBatchPOST, 0);
                });
            });

            let createdTxnId = undefined as undefined | string;
            await this.describe(`get & put`, async function()
            {
                const randTxnBaseBody = getRandTxnBaseBody();

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
                        tagIds: [testContext.txnTagId1]
                    } satisfies PostTxnAPIClass.RequestItemDTOClass;

                    const createdTxn = await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL,
                        body: { transactions: [ baseObj ] },
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200
                    });

                    createdTxnId = createdTxn.parsedBody.id[0];
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
                    assertStrictEqual(txnCreated.parsedBody.rangeItems[0].tagIds[0], testContext.txnTagId1);
                    assertStrictEqual(txnCreated.parsedBody.rangeItems[0].id, createdTxnId);
                    assertStrictEqual(txnCreated.parsedBody.rangeItems[0].title, randTxnBaseBody.title);
                    assertStrictEqual(txnCreated.parsedBody.rangeItems[0].changeInValue, "0");
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
                            tagIds: [testContext.txnTagId2],
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
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].tagIds[0], testContext.txnTagId2);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].creationDate, txnCreated.parsedBody.rangeItems[0].creationDate);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].description, "changed desc");
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].title, "changed title");
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].changeInValue, "-171");
                })
            });

            await this.describe(`delete`, async function()
            {
                await this.test(`Deleting without query`, async function ()
                {
                    await TransactionHelpers.deleteTransaction({
                        serverURL: serverURL,
                        token: firstUser.token,
                        expectedCode: 400,
                        txnId: undefined
                    });
                });

                await this.test(`Deleting non-existent txn`, async function ()
                {
                    await TransactionHelpers.deleteTransaction({
                        serverURL: serverURL,
                        token: firstUser.token,
                        expectedCode: 404,
                        txnId: createdTxnId + "123"
                    });
                });

                await this.test(`Deleting existent txn`, async function ()
                {
                    await TransactionHelpers.deleteTransaction({
                        serverURL: serverURL,
                        token: firstUser.token,
                        expectedCode: 200,
                        txnId: createdTxnId
                    });

                    const response = await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200,
                        id: createdTxnId
                    });

                    assertStrictEqual(response.parsedBody.totalItems, 0);
                });
            });
        });
    });
}