import { resetDatabase, serverURL, TESTS_ENDPOINTS } from "../../index.test.ts";
import { AssertFetchReturns, assertStrictEqual, HTTPAssert } from "../../lib/assert.ts";
import { Context } from "../../lib/context.ts";
import { BodyGenerator } from "../../lib/bodyGenerator.ts";
import { simpleFaker } from "@faker-js/faker";
import { GetTxnAPI } from "../../../../api-types/txn.d.ts";
import { PostCurrencyAPIClass } from "../currency/classes.ts";
import { AuthHelpers } from "../auth/helpers.ts";
import { PostContainerAPIClass } from "../container/classes.ts";
import { PostTxnAPIClass } from "./classes.ts";
import { TransactionHelpers } from "./helpers.ts";
import { TxnTagHelpers } from "../txnTag/helpers.ts";
import { executeInRandomOrder, fillArray } from "../../lib/utils.ts";

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
        fileIds: []
    };
}

export default async function(this: Context)
{
    await this.module("Transactions", async function()
    {
        await this.module(TESTS_ENDPOINTS['transactions']['get'], async function()
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
                const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['currencies']['post'],
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
                const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['currencies']['post'],
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
                const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['containers']['post'],
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
                    fragments:
                    [
                        {
                            fromAmount: "200",
                            fromContainer: testContext.containerId,
                            fromCurrency: testContext.baseCurrId,
                            toAmount: null,
                            toContainer: null,
                            toCurrency: null
                        }
                    ],
                    tagIds: [testContext.txnTagId1],
                    excludedFromIncomesExpenses: false
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

                await this.test(`Forbid creating transactions with no fragments`, async function()
                {
                    await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL,
                        body: { transactions: [ { ...baseObj, fragments: [] } ] },
                        token: firstUser.token,
                        assertBody: false,
                        expectedCode: 400
                    });
                });

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

                    const _response = await TransactionHelpers.postCreateTransaction(
                    {
                        serverURL: serverURL, body:
                        {
                            transactions:
                            [
                                baseObj,
                                baseObj,
                                {
                                    ...baseObj,
                                    fragments: // Try adding multiple fragments here
                                    [
                                        baseObj.fragments[0],
                                        baseObj.fragments[0]
                                    ]
                                }
                            ]
                        },
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

                await this.test(`Test if transactional query is working in creating txns in batch with bursts`, async function()
                {
                    const txnCountBeforeBatchPOST = (await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL, token: firstUser.token,
                        assertBody: true, expectedCode: 200,
                    })).parsedBody.rangeItems.length;

                    const burstCount = 50;

                    {
                        const invalidRequestsPOST = fillArray(burstCount, () =>
                        {
                            return async () => await TransactionHelpers.postCreateTransaction(
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
                            })
                        });

                        const validRequestsPOST = fillArray(burstCount, () =>
                        {
                            return async () =>
                            {
                                await TransactionHelpers.postCreateTransaction(
                                {
                                    serverURL: serverURL,token: firstUser.token, assertBody: false, expectedCode: 200,
                                    body: { transactions: [ baseObj, baseObj, ] }
                                });
                            };
                        });

                        const validRequestsGET = fillArray(burstCount, () =>
                        {
                            return async () =>
                            {
                                return new Promise<void>(resolve =>
                                {
                                    setTimeout(async () =>
                                    {
                                        await TransactionHelpers.getTransaction(
                                        {
                                            serverURL: serverURL, token: firstUser.token,
                                            assertBody: true, expectedCode: 200,
                                        });

                                        resolve();
                                    }, Math.random() * 1000);
                                });
                            }
                        });

                        const validRequestsGETQuery = fillArray(burstCount, () =>
                        {
                            return async () =>
                            {
                                return new Promise<void>(resolve =>
                                {
                                    setTimeout(async () =>
                                    {
                                        await TransactionHelpers.getTransactionJSONQuery(
                                        {
                                            serverURL: serverURL, token: firstUser.token,
                                            assertBody: true, expectedCode: 200,
                                            query: "$DELTA<0 or $not($contains($TITLE_LOWER, 'dinner'))"
                                        });

                                        resolve();
                                    }, Math.random() * 1000);
                                })
                            }
                        });

                        await executeInRandomOrder([...invalidRequestsPOST, ...validRequestsPOST, ...validRequestsGET, ...validRequestsGETQuery]);
                    }

                    const txnCountAfterBatchPOST = (await TransactionHelpers.getTransaction(
                    {
                        serverURL: serverURL, token: firstUser.token,
                        assertBody: true, expectedCode: 200,
                    })).parsedBody.rangeItems.length;

                    // Assert that only valid txns are added
                    assertStrictEqual(txnCountAfterBatchPOST - txnCountBeforeBatchPOST, burstCount * 2);
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
                        fragments: [{
                            fromAmount: "200",
                            fromContainer: testContext.containerId,
                            fromCurrency: testContext.baseCurrId,
                            toAmount: "200",
                            toContainer: testContext.containerId,
                            toCurrency: testContext.baseCurrId,
                        }],
                        tagIds: [testContext.txnTagId1],
                        excludedFromIncomesExpenses: false
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
                            fragments: [{
                                fromAmount: "171",
                                fromContainer: testContext.containerId,
                                fromCurrency: testContext.baseCurrId,
                                toAmount: null,
                                toContainer: null,
                                toCurrency: null,
                            }],
                            tagIds: [testContext.txnTagId2],
                            creationDate: txnCreated.parsedBody.rangeItems[0].creationDate,
                            description: "changed desc",
                            title: "changed title",
                            excludedFromIncomesExpenses: false,
                            fileIds: []
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
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fragments[0].fromAmount, "171");
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fragments[0].fromContainer, testContext.containerId);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fragments[0].fromCurrency, testContext.baseCurrId);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fragments[0].toAmount, null);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fragments[0].toContainer, null);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].fragments[0].toCurrency, null);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].tagIds[0], testContext.txnTagId2);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].creationDate, txnCreated.parsedBody.rangeItems[0].creationDate);
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].description, "changed desc");
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].title, "changed title");
                    assertStrictEqual(txnAfterMutated.parsedBody.rangeItems[0].changeInValue, "-171");
                })
            });

            await this.describe(`get via JSON Query`, async function()
            {
                await this.test(`Getting the posted txn by id`, async function ()
                {
                    const txns = await TransactionHelpers.getTransactionJSONQuery(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200,
                        query: `id = "${createdTxnId}"`
                    });

                    assertStrictEqual(txns.parsedBody.rangeItems.length, 1);
                    assertStrictEqual(txns.parsedBody.rangeItems[0].id, createdTxnId);
                    assertStrictEqual(txns.parsedBody.rangeItems[0].changeInValue, "-171");
                });

                await this.test(`Getting the posted txn without matches`, async function ()
                {
                    const txns = await TransactionHelpers.getTransactionJSONQuery(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200,
                        query: `id = "${createdTxnId}" and 1 = 2`
                    });

                    assertStrictEqual(txns.parsedBody.rangeItems.length, 0);
                });

                await this.test(`Disallow function bindings`, async function ()
                {
                    await TransactionHelpers.getTransactionJSONQuery(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        assertBody: false,
                        expectedCode: 400,
                        query: `
                            (
                                $b := function($x) {( $a($x) )};
                                1 = 1
                            )
                        `
                    });
                });

                await this.test(`Getting the posted txn by changeInValue`, async function ()
                {
                    const txns = await TransactionHelpers.getTransactionJSONQuery(
                    {
                        serverURL: serverURL,
                        token: firstUser.token,
                        assertBody: true,
                        expectedCode: 200,
                        query: `$DELTA=-171`
                    });

                    assertStrictEqual(txns.parsedBody.rangeItems.length, 1);
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