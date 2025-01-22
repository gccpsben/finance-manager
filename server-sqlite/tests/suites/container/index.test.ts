import { randomUUID } from "node:crypto";
import { resetDatabase, serverURL, TESTS_ENDPOINTS, TestUserEntry } from "../../index.test.ts";
import { assertBodyConfirmToModel, assertJSONEqual, assertStrictEqual, HTTPAssert } from "../../lib/assert.ts";
import { Context } from "../../lib/context.ts";
import { BodyGenerator } from "../../lib/bodyGenerator.ts";
import { Decimal } from "decimal.js";
import { simpleFaker } from "@faker-js/faker";
import { ContainerHelpers } from "./helpers.ts";
import { AuthHelpers } from "../auth/helpers.ts";
import { CurrencyHelpers } from "../currency/helpers.ts";
import { PostCurrencyRateDatumAPIClass } from "../currency/classes.ts";
import { TransactionHelpers } from "../transaction/helpers.ts";
import { TxnTagHelpers } from "../txnTag/helpers.ts";
import { postCurrencyRateDatum } from "../currency/index.test.ts";

function choice<T> (list: T[]) { return list[Math.floor((Math.random()*list.length))]; }

export default async function(this: Context)
{
    const testDateTimestamp = Date.now();
    const offsetDate = (d: number) => testDateTimestamp + d * 100 * 1000; // convert the mock date in test case to real date

    await this.module("Containers", async function()
    {
        await this.module(TESTS_ENDPOINTS['containers']['get'], async function()
        {
            await this.module(`post`, async function()
            {
                await resetDatabase();
                await this.test(`Forbid creating containers without / wrong tokens`, async function()
                {
                    await HTTPAssert.assertFetch(TESTS_ENDPOINTS['containers']['post'],
                    {
                        baseURL: serverURL,
                        expectedStatus: 401, method: "POST"
                    });

                    await HTTPAssert.assertFetch(TESTS_ENDPOINTS['containers']['post'],
                    {
                        baseURL: serverURL, expectedStatus: 401, method: "POST",
                        init: { headers: { "authorization": randomUUID() } }
                    });
                });

                await this.test(`Test for OwnerID and Name pri-subpri relationship (5x5)`, async function()
                {
                    await resetDatabase();

                    const relationshipMatrix = BodyGenerator.enumeratePrimarySubPrimaryMatrixUUID(5,5);

                    const testUsersCreds: TestUserEntry[] = relationshipMatrix.userIDs.map(user => (
                    {
                        password: `${user}password`,
                        username: user,
                    }));

                    // Register users for each user in matrix
                    await AuthHelpers.registerMockUsersArray(serverURL, testUsersCreds);

                    for (const testCase of relationshipMatrix.matrix)
                    {
                        const  userToken = testUsersCreds.find(x => x.username === testCase.primaryValue)!.token;
                        await ContainerHelpers.postCreateContainer(
                        {
                            serverURL: serverURL,
                            body: { name: testCase.subPrimaryValue },
                            token: userToken,
                            assertBody: testCase.expectedPass,
                            expectedCode: testCase.expectedPass ? 200 : 400
                        });
                    }
                });
            });

            await this.module(`get`, async function()
            {
                await resetDatabase();

                await this.test(`Forbid getting containers without / wrong tokens`, async function()
                {
                    await HTTPAssert.assertFetch(TESTS_ENDPOINTS['containers']['post'],
                    {
                        baseURL: serverURL,
                        expectedStatus: 401, method: "GET"
                    });

                    await HTTPAssert.assertFetch(TESTS_ENDPOINTS['containers']['post'],
                    {
                        baseURL: serverURL, expectedStatus: 401, method: "GET",
                        init: { headers: { "authorization": randomUUID() } }
                    });
                });

                await this.module(`Container balances and values correctness`, async function()
                {
                    type txnDatum =
                    {
                        fragments: {
                            toAmount: Decimal|undefined,
                            toCurrencyID?: string|undefined,
                            toContainerId?: string|undefined,
                            fromAmount: Decimal|undefined,
                            fromCurrencyID?: string|undefined,
                            fromContainerId?: string|undefined,
                        }[],
                        txnAgeDays: number
                    };
                    const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
                    const userObj = Object.values(userCreds)[0];

                    const txnTypes = await TxnTagHelpers.postRandomTxnTags(
                    {
                        serverURL: serverURL, token: userObj.token,
                        txnCount: 3, assertBody: true, expectedCode: 200
                    });
                    const containers = await ContainerHelpers.postRandomContainers(
                    {
                        serverURL: serverURL, token: userObj.token,
                        containerCount: 3, assertBody: true, expectedCode: 200
                    });
                    const baseCurrency = await CurrencyHelpers.postCreateCurrency(
                    {
                        body: { name: "BASE", ticker: "BASE" }, serverURL: serverURL,
                        token: userObj.token, assertBody: true, expectedCode: 200
                    });
                    const secondCurrency = await CurrencyHelpers.postCreateCurrency(
                    {
                        body: { name: "SEC", ticker: "SEC", fallbackRateAmount: '1', fallbackRateCurrencyId: baseCurrency.currencyId },
                        serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200
                    });
                    const thirdCurrency = await CurrencyHelpers.postCreateCurrency(
                    {
                        body: { name: "THIRD", ticker: "THIRD", fallbackRateAmount: '1', fallbackRateCurrencyId: secondCurrency.currencyId },
                        serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200
                    });
                    const secondCurrencyDatum =
                    [
                        { key: new Decimal(`100`), value: new Decimal(`150`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`80`), value: new Decimal(`150`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`60`), value: new Decimal(`70`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`40`), value: new Decimal(`50`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`20`), value: new Decimal(`100`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`0`), value: new Decimal(`0`), cId: baseCurrency.currencyId },
                    ];
                    const thirdCurrencyDatum =
                    [
                        { key: new Decimal(`100`), value: new Decimal(`100`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`80`), value: new Decimal(`150`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`60`), value: new Decimal(`25`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`40`), value: new Decimal(`50`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`20`), value: new Decimal(`25`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`0`), value: new Decimal(`1`), cId: secondCurrency.currencyId },
                    ];

                    const txnsToPost: txnDatum[] =
                    [
                        {
                            fragments: [
                                {
                                    fromAmount: undefined,
                                    toAmount: new Decimal(`50.0000`),
                                    toCurrencyID: baseCurrency.currencyId,
                                    toContainerId: containers[0].containerId,
                                },
                                {
                                    fromAmount: undefined,
                                    toAmount: new Decimal(`50.0000`),
                                    toCurrencyID: baseCurrency.currencyId,
                                    toContainerId: containers[0].containerId,
                                },
                                {
                                    fromAmount: new Decimal(`100.0000`),
                                    toAmount: undefined,
                                    fromCurrencyID: baseCurrency.currencyId,
                                    fromContainerId: containers[0].containerId,
                                },
                                {
                                    fromAmount: undefined,
                                    toAmount: new Decimal(`100.0000`),
                                    toCurrencyID: baseCurrency.currencyId,
                                    toContainerId: containers[0].containerId,
                                }
                            ],
                            txnAgeDays: 90
                        },
                        {
                            fragments: [
                                {
                                    fromAmount: undefined,
                                    toAmount: new Decimal(`200.0000`),
                                    toCurrencyID: baseCurrency.currencyId,
                                    toContainerId: containers[1].containerId,
                                },
                                {
                                    fromAmount: undefined,
                                    toAmount: new Decimal(`2.0000`),
                                    toCurrencyID: secondCurrency.currencyId,
                                    toContainerId: containers[0].containerId,
                                }
                            ],
                            txnAgeDays: 80
                        },
                        {
                            fragments: [
                                {
                                    fromAmount: new Decimal(`99.0000`),
                                    fromCurrencyID: baseCurrency.currencyId,
                                    fromContainerId: containers[0].containerId,
                                    toAmount: new Decimal(`2.0000`),
                                    toCurrencyID: thirdCurrency.currencyId,
                                    toContainerId: containers[1].containerId,
                                }
                            ],
                            txnAgeDays: 50
                        },
                    ];

                    await this.test(`Posting Currency Rate Datums`, async function()
                    {
                        async function postCurrencyDatums(cId: string, datums: {key:Decimal, value:Decimal, cId: string}[])
                        {
                            for (const datum of datums)
                            {
                                const response = await postCurrencyRateDatum
                                (
                                    userObj.token,
                                    datum.value.toString(),
                                    cId,
                                    datum.cId,
                                    offsetDate(datum.key.toNumber())
                                );

                                assertStrictEqual(response.res.status, 200);
                                await assertBodyConfirmToModel(PostCurrencyRateDatumAPIClass.ResponseDTO, response.rawBody);
                            }
                        }

                        await postCurrencyDatums(secondCurrency.currencyId, secondCurrencyDatum);
                        await postCurrencyDatums(thirdCurrency.currencyId, thirdCurrencyDatum);
                    });

                    for (const txnToPost of txnsToPost)
                    {
                        await TransactionHelpers.postCreateTransaction(
                        {
                            body:
                            {
                                transactions:
                                [
                                    {
                                        title: randomUUID(),
                                        creationDate: Date.now() - txnToPost.txnAgeDays * 8.64e+7,
                                        description: simpleFaker.string.sample(100),
                                        fragments: txnToPost.fragments.map(f =>
                                        {
                                            const isFrom = !!f.fromAmount;
                                            const isTo = !!f.toAmount;
                                            return {
                                                fromAmount: isFrom ? f.fromAmount.toString() : undefined,
                                                fromContainer: isFrom ? f.fromContainerId : undefined,
                                                fromCurrency: isFrom ? f.fromCurrencyID : undefined,
                                                toAmount: isTo ? f.toAmount.toString() : undefined,
                                                toContainer: isTo ? f.toContainerId : undefined,
                                                toCurrency: isTo ? f.toCurrencyID : undefined,
                                            }
                                        }),
                                        tagIds: [choice(txnTypes).txnId],
                                        excludedFromIncomesExpenses: false,
                                        fileIds: []
                                    }
                                ]
                            },
                            serverURL: serverURL,
                            token: userObj.token,
                            assertBody: true,
                            expectedCode: 200
                        });
                    }

                    await this.test(`Test for correctness of balances and values (1)`, async function()
                    {
                        const res = await ContainerHelpers.getUserContainers(
                        {
                            serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200,
                            dateEpoch: offsetDate(0)
                        });

                        assertStrictEqual(res.parsedBody.rangeItems.length, 3);

                        assertStrictEqual(res.parsedBody.rangeItems[0].value, "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[baseCurrency.currencyId], "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[secondCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[thirdCurrency.currencyId], undefined);

                        assertStrictEqual(res.parsedBody.rangeItems[1].value, "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[baseCurrency.currencyId], "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[thirdCurrency.currencyId], "2");

                        assertStrictEqual(res.parsedBody.rangeItems[2].value, "0");
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[baseCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[thirdCurrency.currencyId], undefined);
                    });

                    await this.test(`Test for correctness of balances and values (2)`, async function()
                    {
                        const res = await ContainerHelpers.getUserContainers(
                        {
                            serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200,
                            dateEpoch: offsetDate(15)
                        });

                        assertStrictEqual(res.parsedBody.rangeItems.length, 3);

                        assertStrictEqual(res.parsedBody.rangeItems[0].value, "151");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[baseCurrency.currencyId], "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[secondCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[thirdCurrency.currencyId], undefined);

                        assertStrictEqual(res.parsedBody.rangeItems[1].value, "3950");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[baseCurrency.currencyId], "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[thirdCurrency.currencyId], "2");

                        assertStrictEqual(res.parsedBody.rangeItems[2].value, "0");
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[baseCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[thirdCurrency.currencyId], undefined);
                    });

                    await this.test(`Test for correctness of balances and values (3)`, async function()
                    {
                        const res = await ContainerHelpers.getUserContainers(
                        {
                            serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200,
                            dateEpoch: offsetDate(74)
                        });

                        assertStrictEqual(res.parsedBody.rangeItems.length, 3);

                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[baseCurrency.currencyId], "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[secondCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[thirdCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[0].value, "253");

                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[baseCurrency.currencyId], "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[thirdCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[1].value, "32750");

                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[baseCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[thirdCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].value, "0");
                    });
                });
            });
        });
        await this.module(TESTS_ENDPOINTS['containers-timelines']['getWithoutParams'](), async function()
        {
            await resetDatabase();

            type txnDatum =
            {
                fragments: {
                    toAmount: Decimal|undefined,
                    toCurrencyID?: string|undefined,
                    toContainerId?: string|undefined,
                    fromAmount: Decimal|undefined,
                    fromCurrencyID?: string|undefined,
                    fromContainerId?: string|undefined,
                }[],
                txnAgeDays: number
            };
            const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const userObj = Object.values(userCreds)[0];

            const txnTypes = await TxnTagHelpers.postRandomTxnTags(
            {
                serverURL: serverURL, token: userObj.token,
                txnCount: 3, assertBody: true, expectedCode: 200
            });
            const containers = await ContainerHelpers.postRandomContainers(
            {
                serverURL: serverURL, token: userObj.token,
                containerCount: 3, assertBody: true, expectedCode: 200
            });
            const baseCurrency = await CurrencyHelpers.postCreateCurrency(
            {
                body: { name: "BASE", ticker: "BASE" }, serverURL: serverURL,
                token: userObj.token, assertBody: true, expectedCode: 200
            });
            const secondCurrency = await CurrencyHelpers.postCreateCurrency(
            {
                body: { name: "SEC", ticker: "SEC", fallbackRateAmount: '1', fallbackRateCurrencyId: baseCurrency.currencyId },
                serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200
            });
            const thirdCurrency = await CurrencyHelpers.postCreateCurrency(
            {
                body: { name: "THIRD", ticker: "THIRD", fallbackRateAmount: '1', fallbackRateCurrencyId: secondCurrency.currencyId },
                serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200
            });
            const secondCurrencyDatum =
            [
                { key: new Decimal(`100`), value: new Decimal(`150`), cId: baseCurrency.currencyId },
                { key: new Decimal(`80`), value: new Decimal(`150`), cId: baseCurrency.currencyId },
                { key: new Decimal(`60`), value: new Decimal(`70`), cId: baseCurrency.currencyId },
                { key: new Decimal(`40`), value: new Decimal(`50`), cId: baseCurrency.currencyId },
                { key: new Decimal(`20`), value: new Decimal(`100`), cId: baseCurrency.currencyId },
                { key: new Decimal(`0`), value: new Decimal(`0`), cId: baseCurrency.currencyId },
            ];
            const thirdCurrencyDatum =
            [
                { key: new Decimal(`100`), value: new Decimal(`100`), cId: secondCurrency.currencyId },
                { key: new Decimal(`80`), value: new Decimal(`150`), cId: secondCurrency.currencyId },
                { key: new Decimal(`60`), value: new Decimal(`25`), cId: secondCurrency.currencyId },
                { key: new Decimal(`40`), value: new Decimal(`50`), cId: secondCurrency.currencyId },
                { key: new Decimal(`20`), value: new Decimal(`25`), cId: secondCurrency.currencyId },
                { key: new Decimal(`0`), value: new Decimal(`1`), cId: secondCurrency.currencyId },
            ];

            const txnsToPost: txnDatum[] =
            [
                {
                    // base: 50
                    fragments: [
                        {
                            fromAmount: undefined,
                            toAmount: new Decimal(`50.0000`),
                            toCurrencyID: baseCurrency.currencyId,
                            toContainerId: containers[0].containerId,
                        },
                    ],
                    txnAgeDays: 90
                },
                {
                    // base: 250
                    fragments: [
                        {
                            fromAmount: undefined,
                            toAmount: new Decimal(`200.0000`),
                            toCurrencyID: baseCurrency.currencyId,
                            toContainerId: containers[0].containerId,
                        }
                    ],
                    txnAgeDays: 80
                },
                {
                    // base: 151, third: 2
                    fragments: [
                        {
                            fromAmount: new Decimal(`99.0000`),
                            fromCurrencyID: baseCurrency.currencyId,
                            fromContainerId: containers[0].containerId,
                            toAmount: new Decimal(`2.0000`),
                            toCurrencyID: thirdCurrency.currencyId,
                            toContainerId: containers[0].containerId,
                        }
                    ],
                    txnAgeDays: 75
                },
                {
                    // base: 100, third: 2, sec: 14.3
                    fragments: [
                        {
                            fromAmount: undefined,
                            fromCurrencyID: undefined,
                            fromContainerId: undefined,
                            toAmount: new Decimal(`14.3`),
                            toCurrencyID: secondCurrency.currencyId,
                            toContainerId: containers[0].containerId,
                        },
                        {
                            fromAmount: new Decimal(`51.0000`),
                            fromCurrencyID: baseCurrency.currencyId,
                            fromContainerId: containers[0].containerId,
                            toAmount: undefined,
                            toCurrencyID: undefined,
                            toContainerId: undefined,
                        }
                    ],
                    txnAgeDays: 50
                },
            ];

            await this.test(`Posting Currency Rate Datums`, async function()
            {
                async function postCurrencyDatums(cId: string, datums: {key:Decimal, value:Decimal, cId: string}[])
                {
                    for (const datum of datums)
                    {
                        const response = await postCurrencyRateDatum
                        (
                            userObj.token,
                            datum.value.toString(),
                            cId,
                            datum.cId,
                            offsetDate(datum.key.toNumber() * -1)
                        );

                        assertStrictEqual(response.res.status, 200);
                        await assertBodyConfirmToModel(PostCurrencyRateDatumAPIClass.ResponseDTO, response.rawBody);
                    }
                }

                await postCurrencyDatums(secondCurrency.currencyId, secondCurrencyDatum);
                await postCurrencyDatums(thirdCurrency.currencyId, thirdCurrencyDatum);
            });

            await this.test(`Posting Transactions`, async function()
            {
                for (const txnToPost of txnsToPost)
                {
                    await TransactionHelpers.postCreateTransaction(
                    {
                        body:
                        {
                            transactions:
                            [
                                {
                                    title: randomUUID(),
                                    creationDate: offsetDate(txnToPost.txnAgeDays * -1),
                                    description: simpleFaker.string.sample(100),
                                    fragments: txnToPost.fragments.map(f =>
                                    {
                                        const isFrom = !!f.fromAmount;
                                        const isTo = !!f.toAmount;
                                        return {
                                            fromAmount: isFrom ? f.fromAmount.toString() : undefined,
                                            fromContainer: isFrom ? f.fromContainerId : undefined,
                                            fromCurrency: isFrom ? f.fromCurrencyID : undefined,
                                            toAmount: isTo ? f.toAmount.toString() : undefined,
                                            toContainer: isTo ? f.toContainerId : undefined,
                                            toCurrency: isTo ? f.toCurrencyID : undefined,
                                        }
                                    }),
                                    tagIds: [choice(txnTypes).txnId],
                                    excludedFromIncomesExpenses: false,
                                    fileIds: []
                                }
                            ]
                        },
                        serverURL: serverURL,
                        token: userObj.token,
                        assertBody: true,
                        expectedCode: 200
                    });
                }
            });

            await this.test(`Testing Correctness`, async function()
            {
                const res = await ContainerHelpers.getContainerTimeline(
                {
                    serverURL: serverURL, token: userObj.token,
                    containerId: containers[0].containerId,
                    assertBody: true, expectedCode: 200,
                    division: 10, endDate: offsetDate(0), startDate: offsetDate(-100)
                });

                const expected = {
                    [offsetDate(-100)]: {
                        containerBalance: {},
                        containerWorth: "0"
                    },
                    [offsetDate(-90)]: {
                        containerBalance: { [baseCurrency.currencyId]: "50" },
                        containerWorth: "50"
                    },
                    [offsetDate(-80)]: {
                        containerBalance: { [baseCurrency.currencyId]: "250" },
                        containerWorth: "250"
                    },
                    [offsetDate(-70)]: {
                        containerBalance: { [baseCurrency.currencyId]: "151", [thirdCurrency.currencyId]: "2" },
                        containerWorth: "24401"
                    },
                    [offsetDate(-60)]: {
                        containerBalance: { [baseCurrency.currencyId]: "151", [thirdCurrency.currencyId]: "2" },
                        containerWorth: "3651"
                    },
                    [offsetDate(-50)]: {
                        containerBalance: { [baseCurrency.currencyId]: "100", [thirdCurrency.currencyId]: "2", [secondCurrency.currencyId]: "14.3" },
                        containerWorth: "5208"
                    },
                    [offsetDate(-40)]: {
                        containerBalance: { [baseCurrency.currencyId]: "100", [thirdCurrency.currencyId]: "2", [secondCurrency.currencyId]: "14.3" },
                        containerWorth: "5815"
                    },
                    [offsetDate(-30)]: {
                        containerBalance: { [baseCurrency.currencyId]: "100", [thirdCurrency.currencyId]: "2", [secondCurrency.currencyId]: "14.3" },
                        containerWorth: "6172.5"
                    },
                    [offsetDate(-20)]: {
                        containerBalance: { [baseCurrency.currencyId]: "100", [thirdCurrency.currencyId]: "2", [secondCurrency.currencyId]: "14.3" },
                        containerWorth: "6530"
                    },
                    [offsetDate(-10)]: {
                        containerBalance: { [baseCurrency.currencyId]: "100", [thirdCurrency.currencyId]: "2", [secondCurrency.currencyId]: "14.3" },
                        containerWorth: "3315"
                    },
                };

                assertJSONEqual(res.parsedBody, { timeline: expected });
            });


        });
    });
}