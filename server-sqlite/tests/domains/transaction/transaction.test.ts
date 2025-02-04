import { PostTxnAPI } from "../../../../api-types/txn.d.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { resetDatabase } from "../server/helpers.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { createPostTransactionFunc, createPutTransactionFunc } from './helpers.ts';
import { AssertFetchJSONAsserts, dictWithoutKeys } from '../../lib/assertions.ts';
import { createPostContainerFunc } from '../container/helpers.ts';
import { createPostBaseCurrencyFunc } from '../currency/helpers.ts';
import { createPostTxnTagFunc } from '../txnTag/helpers.ts';
import { createGetTransactionsFunc, createGetTransactionsJSONFunc } from './helpers.ts';
import { assertEquals } from 'jsr:@std/assert/equals';
import { GetTxnJSONQueryAPIClass } from "./classes.ts";
import { createPostCurrencyFunc } from '../currency/helpers.ts';
import { executeInRandomOrder, fillArray, sortDictionaryKeys } from "../../lib/collections.ts";
import { shuffleArray } from '../../lib/collections.ts';
import { createDelTransactionFunc } from './helpers.ts';

const beforeEachSetup = async (test: Deno.TestContext) =>
{
    await ensureTestIsSetup();
    await resetDatabase();

    const testUsername = "USER_1";
    const testPassword = "PASS_1";

    let testUserToken: string;
    await test.step("Creating users for test", async () =>
    {
        const userCreated = await AuthHelpers.registerMockUsersArray(
        {
            port: port!,
            usersCreds: [ { username: testUsername, password: testPassword } ]
        });
        testUserToken = userCreated[testUsername];
    });

    let containerId: string;
    await test.step(`Creating container for test`, async () =>
    {
        const container = await createPostContainerFunc()
        ({ token: testUserToken, asserts: 'default', body: ['EXPECTED', { name: "My Container" }] });
        containerId = container.parsedBody?.id!;
    });

    let baseCurrencyId: string;
    await test.step(`Creating base currency for test`, async () =>
    {
        const currencyRes = await createPostBaseCurrencyFunc()
        ({
            token: testUserToken,
            asserts: 'default',
            body: [ 'EXPECTED', { name: "Base Currency", ticker: "BASE", } ]
        });
        baseCurrencyId = currencyRes.parsedBody?.id!;
    });

    return {
        usrToken: testUserToken!,
        containerId: containerId!,
        baseCurrencyId: baseCurrencyId!
    };
};

Deno.test(
{
    name: "CRUD Transactions",
    async fn(test)
    {
        const testDate = Date.now();
        await ensureTestIsSetup();
        await resetDatabase();

        const { baseCurrencyId, containerId, usrToken } = await beforeEachSetup(test);
        const secondCurrencyId = await (async () =>
        {
            const currencyRes = await createPostCurrencyFunc()
            ({
                token: usrToken,
                asserts: 'default',
                body: [ 'EXPECTED', { name: "Second Currency", ticker: "SEC", fallbackRateAmount: "5", fallbackRateCurrencyId: baseCurrencyId } ]
            });
            return currencyRes.parsedBody!.id;
        })();
        const txnTagId = (await createPostTxnTagFunc()
                         ({ token: usrToken, asserts: 'default', body: ['EXPECTED', { name: "My Tag" }] })).parsedBody?.id!;

        await test.step("Reject POST without token", async () =>
        {
            await createPostTransactionFunc()
            ({
                token: undefined,
                asserts: { status: 401 },
                body:
                [
                    'EXPECTED',
                    {
                        transactions: [
                            {
                                excludedFromIncomesExpenses: false,
                                fileIds: [],
                                fragments: [],
                                tagIds: [],
                                title: "Testing Txn",
                                creationDate: Date.now(),
                                description: "My description"
                            }
                        ]
                    }
                ],
            });
        });

        await test.step("Reject POST missing required fields", async (test) =>
        {
            const validTxnBody =
            {
                excludedFromIncomesExpenses: false,
                fileIds: [],
                fragments: [
                    {
                        fromAmount: "0",
                        fromContainer: containerId,
                        fromCurrency: baseCurrencyId,
                        toAmount: null,
                        toContainer: null,
                        toCurrency: null
                    }
                ],
                tagIds: [],
                title: "Testing Txn",
                creationDate: Date.now(),
                description: "My description"
            } as PostTxnAPI.RequestItemDTO;

            const requiredProps: (keyof PostTxnAPI.RequestItemDTO)[] = [
                'excludedFromIncomesExpenses',
                'fileIds',
                'fragments',
                'tagIds',
                'title'
            ];

            for (const missingProp of requiredProps)
            {
                await test.step(`Missing ${missingProp}`, async () =>
                {
                    await createPostTransactionFunc()
                    ({
                        token: usrToken,
                        asserts: { status: 400 },
                        body:
                        [
                            'CUSTOM',
                            {
                                transactions: [
                                    dictWithoutKeys(validTxnBody, [missingProp])
                                ]
                            }
                        ],
                    });
                });
            }
        });

        await test.step("Reject POST with unknown tag ids", async () =>
        {
            const validTxnBody =
            {
                excludedFromIncomesExpenses: true,
                fileIds: [],
                fragments: [
                    {
                        fromAmount: "0",
                        fromContainer: containerId,
                        fromCurrency: baseCurrencyId,
                        toAmount: null,
                        toContainer: null,
                        toCurrency: null
                    }
                ],
                tagIds: ["UnknownId"],
                title: "Testing Txn",
                creationDate: Date.now()
            } as PostTxnAPI.RequestItemDTO;

            await createPostTransactionFunc()
            ({
                token: usrToken,
                asserts: { status: 400 },
                body: [ 'CUSTOM', { transactions: [validTxnBody] } ],
            });
        });

        await test.step("Reject POST with invalid fragments", async (test) =>
        {
            const invalidFragments = [
                {
                    caseName: "Missing fragment",
                    fragment: null
                },
                {
                    caseName: "Missing from and to",
                    fragment:
                    {
                        fromAmount: null, fromContainer: null, fromCurrency: null,
                        toAmount: null, toContainer: null, toCurrency: null
                    }
                },
                {
                    caseName: "From missing from amount",
                    fragment:
                    {
                        fromAmount: null, fromContainer: containerId, fromCurrency: baseCurrencyId,
                        toAmount: null, toContainer: null, toCurrency: null
                    }
                },
                {
                    caseName: "From unknown Container",
                    fragment:
                    {
                        fromAmount: "1", fromContainer: containerId + "_", fromCurrency: baseCurrencyId,
                        toAmount: null, toContainer: null, toCurrency: null
                    }
                },
                {
                    caseName: "From unknown Currency",
                    fragment:
                    {
                        fromAmount: "1", fromContainer: containerId, fromCurrency: baseCurrencyId + "_",
                        toAmount: null, toContainer: null, toCurrency: null
                    }
                },
                {
                    caseName: "To missing To amount",
                    fragment:
                    {
                        fromAmount: null, fromContainer: null, fromCurrency: null,
                        toAmount: null, toContainer: containerId, toCurrency: baseCurrencyId
                    }
                },
                {
                    caseName: "To unknown Container",
                    fragment:
                    {
                        fromAmount: null, fromContainer: null, fromCurrency: null,
                        toAmount: "1", toContainer: containerId + "_", toCurrency: baseCurrencyId
                    }
                },
                {
                    caseName: "To unknown Currency",
                    fragment:
                    {
                        fromAmount: null, fromContainer: null, fromCurrency: null,
                        toAmount: "1", toContainer: containerId, toCurrency: baseCurrencyId + "_"
                    }
                }
            ];

            for (const [index, invalidFragment] of Object.entries(invalidFragments))
            {
                const txnBody =
                {
                    excludedFromIncomesExpenses: true,
                    fileIds: [],
                    fragments: invalidFragment.fragment === null ? [] : [invalidFragment.fragment],
                    tagIds: [],
                    title: "Testing Txn",
                    creationDate: Date.now()
                } as PostTxnAPI.RequestItemDTO;

                await test.step(`Test ${index} - ${invalidFragment.caseName}`, async () =>
                {
                    await createPostTransactionFunc()
                    ({
                        token: usrToken,
                        asserts: { status: 400 },
                        body: [ 'CUSTOM', { transactions: [txnBody] } ],
                    });
                });
            }
        });

        const validTxnBody =
        {
            excludedFromIncomesExpenses: true,
            fileIds: [],
            fragments: [
                {
                    fromAmount: "100",
                    fromContainer: containerId,
                    fromCurrency: baseCurrencyId,
                    toAmount: null,
                    toContainer: null,
                    toCurrency: null
                }
            ],
            tagIds: [txnTagId],
            title: "Testing Txn",
            description: "Testing description"
        };
        let validTxnId1: string;
        await test.step("Allow POST with valid body", async () =>
        {
            const res = await createPostTransactionFunc()
            ({
                token: usrToken,
                asserts: 'default',
                body: [ 'EXPECTED', { transactions: [validTxnBody] } ],
            });
            validTxnId1 = res.parsedBody!.id[0];
        });

        await test.step(`Reject GET without token`, async () =>
        {
            await createGetTransactionsFunc({})
            ({
                token: undefined,
                asserts: { status: 401 }
            });
        });

        await test.step(`Allow GET`, async () =>
        {
            const res = await createGetTransactionsFunc({})
            ({
                token: usrToken,
                asserts: 'default'
            });
            assertEquals(res.parsedBody?.startingIndex, 0, "Starting index expected to be 0");
            assertEquals(res.parsedBody?.endingIndex, 0, "Ending index expected to be 1");
            assertEquals(res.parsedBody?.rangeItems.length, 1, "Range items expected to have 1 element");
            assertEquals(res.parsedBody?.totalItems, 1, "Total items expected to be 1.");
            assertEquals(res.parsedBody?.rangeItems[0].title, validTxnBody.title);
            assertEquals(res.parsedBody?.rangeItems[0].changeInValue, `-100`);
            assertEquals(res.parsedBody?.rangeItems[0].excludedFromIncomesExpenses, validTxnBody.excludedFromIncomesExpenses);
            assertEquals(res.parsedBody?.rangeItems[0].description, validTxnBody.description);
        });

        await test.step(`Reject GET via JSON without token`, async () =>
        {
            await createGetTransactionsJSONFunc({ query: "true" })
            ({
                token: undefined,
                asserts: { status: 401 }
            });
        });

        await test.step(`Check GET via JSON Correctness`, async (test) =>
        {
            const txnsToPost =
            [
                {
                    excludedFromIncomesExpenses: false,
                    fileIds: [],
                    fragments: [
                        {
                            fromAmount: "12.28750182051",
                            fromContainer: containerId,
                            fromCurrency: baseCurrencyId,
                            toAmount: null,
                            toContainer: null,
                            toCurrency: null
                        }
                    ],
                    tagIds: [],
                    title: "My new txn",
                    description: "My new desc",
                    creationDate: testDate - 8.64e+8 // 10 days ago
                },
                {
                    excludedFromIncomesExpenses: false,
                    fileIds: [],
                    fragments: [
                        {
                            fromAmount: null,
                            fromContainer: null,
                            fromCurrency: null,
                            toAmount: "10",
                            toContainer: containerId,
                            toCurrency: secondCurrencyId,
                        }
                    ],
                    tagIds: [txnTagId],
                    title: "Testing Txn",
                    description: "Testing description",
                    creationDate: testDate - 4.32e+8 // 5 days ago
                }
            ];

            await test.step(`Setup new transactions`, async () =>
            {
                for (const txn of txnsToPost)
                {
                    await createPostTransactionFunc()
                    ({
                        token: usrToken,
                        asserts: 'default',
                        body: [ 'EXPECTED', { transactions: [txn] } ],
                    });
                }
            });

            const testCases =
            [
                {
                    reqAsserts: 'default',
                    query: 'true',
                    assert: parsedBody => { assertEquals(parsedBody?.rangeItems.length, 3); }
                },
                {
                    reqAsserts: 'default',
                    query: '$not(false)',
                    assert: parsedBody => { assertEquals(parsedBody?.rangeItems.length, 3); }
                },
                {
                    reqAsserts: 'default',
                    query: `$contains($TITLE_LOWER, "txn")`,
                    assert: parsedBody => { assertEquals(parsedBody?.rangeItems.length, 3); }
                },
                {
                    reqAsserts: 'default',
                    query: `$contains($TITLE, "txn")`,
                    assert: parsedBody => { assertEquals(parsedBody?.rangeItems.length, 1); }
                },
                {
                    reqAsserts: 'default',
                    query: `$contains($TITLE_LOWER, "txn") and $DELTA = -100`,
                    assert: parsedBody => { assertEquals(parsedBody?.rangeItems.length, 1); }
                },
                {
                    reqAsserts: 'default',
                    query: `$AGE_DAY > 7`,
                    assert: parsedBody =>
                    {
                        assertEquals(parsedBody?.rangeItems.length, 1);
                        assertEquals(parsedBody.rangeItems[0].title, txnsToPost[0].title);
                    }
                },
                {
                    reqAsserts: 'default',
                    query: `$AGE_DAY = 7`,
                    assert: parsedBody => { assertEquals(parsedBody?.rangeItems.length, 0); }
                },
                {
                    reqAsserts: 'default',
                    query: `$withTicker('SEC')`,
                    assert: parsedBody =>
                    {
                        assertEquals(parsedBody?.rangeItems.length, 1);
                        assertEquals(parsedBody?.rangeItems[0].changeInValue, "50");
                    }
                },
                {
                    reqAsserts: { status: 400 },
                    query: ``,
                    assert: () => { }
                },
                {
                    reqAsserts: { status: 400 },
                    query: `$my_func := function($x) {( true )}`,
                    assert: () => { }
                }
            ] as
            {
                query: string,
                assert: (parsedBody: GetTxnJSONQueryAPIClass.ResponseDTOClass) => Promise<void>,
                reqAsserts: "default" | AssertFetchJSONAsserts<GetTxnJSONQueryAPIClass.ResponseDTOClass> | undefined
            }[];

            for (const [indexStr, testCase] of Object.entries(testCases))
            {
                await test.step(`Check for correctness (${indexStr})`, async () =>
                {
                    const response = await createGetTransactionsJSONFunc({ query: testCase.query })
                    ({
                        token: usrToken,
                        asserts: testCase.reqAsserts
                    });
                    testCase.assert(response.parsedBody!);
                });
            }
        });

        // In this test, we want to generate many requests, and launch them at the same time.
        // The server should not return any error, and all of the valid requests should still be processed.
        await test.step(`CRUD Bursts Test`, async (test) =>
        {
            let txnCountBeforeBursts:number;
            await test.step("Record txn count before tests", async () =>
            {
                const res = await createGetTransactionsFunc({})
                ({ token: usrToken, asserts: 'default' });
                txnCountBeforeBursts = res.parsedBody?.totalItems!;
            });

            {
                const burstsCount = 150;
                const invalidPostTxnReqs = fillArray(burstsCount, () =>
                {
                    return async () => await createPostTransactionFunc()
                    ({
                        token: usrToken, asserts: { status: 400 },
                        body:
                        [
                            'CUSTOM',
                            {
                                transactions: [
                                    validTxnBody,
                                    validTxnBody,
                                    { ...validTxnBody, creationDate: "FAILURE VALUE" }
                                ]
                            }
                        ]
                    });
                });

                const validPostCurrReqs = fillArray(burstsCount, (burstIndex: number) =>
                {
                    return async () => await createPostCurrencyFunc()
                    ({
                        token: usrToken, asserts: 'default',
                        body:
                        [
                            'EXPECTED',
                            {
                                fallbackRateAmount: (Math.random() * 10000).toString(),
                                fallbackRateCurrencyId: baseCurrencyId,
                                name: `Currency - ${burstIndex}`,
                                ticker: `${burstIndex}-CURR`,
                            }
                        ]
                    });
                });

                const validPostTxnReqs = fillArray(burstsCount, () =>
                {
                    return async () => await createPostTransactionFunc()
                    ({
                        token: usrToken, asserts: 'default',
                        body:
                        [
                            'CUSTOM',
                            {
                                transactions: [
                                    validTxnBody,
                                    validTxnBody,
                                    validTxnBody,
                                    validTxnBody
                                ]
                            }
                        ]
                    });
                });

                const validGetTxnReqs = fillArray(burstsCount, () =>
                {
                    return async () => await createGetTransactionsFunc({})
                    ({ token: usrToken, asserts: 'default', });
                });

                const validGetTxnJSON_1_Reqs = fillArray(burstsCount, () =>
                {
                    return async () => await createGetTransactionsJSONFunc({ query: "$DELTA = 0" })
                    ({ token: usrToken, asserts: 'default', });
                });

                const validGetTxnJSON_2_Reqs = fillArray(burstsCount, () =>
                {
                    return async () => await createGetTransactionsJSONFunc({ query: `$withTicker('BASE')` })
                    ({ token: usrToken, asserts: 'default', });
                });

                const allReqs = [
                    ...invalidPostTxnReqs,
                    ...validPostCurrReqs,
                    ...validPostTxnReqs,
                    ...validGetTxnReqs,
                    ...validGetTxnJSON_1_Reqs,
                    ...validGetTxnJSON_2_Reqs
                ];
                shuffleArray(allReqs);

                await test.step(`Burst Tests (Total ${allReqs.length} requests)`, async () =>
                {
                    await executeInRandomOrder(allReqs);
                });

                await test.step("Check for correctness", async () =>
                {
                    const res = await createGetTransactionsFunc({})
                    ({ token: usrToken, asserts: 'default' });
                    assertEquals(res.parsedBody?.totalItems, txnCountBeforeBursts + burstsCount * 4);
                });
            }
        });

        await test.step(`Reject PUT without token`, async () =>
        {
            await createPutTransactionFunc({ targetTxnId: validTxnId1 })
            ({
                token: undefined,
                asserts: { status: 401 }
            });
        });

        await test.step(`Allow PUT`, async () =>
        {
            const newTxnBody = {
                excludedFromIncomesExpenses: !validTxnBody.excludedFromIncomesExpenses,
                fileIds: [],
                fragments: [
                    {
                        fromAmount: null,
                        fromContainer: null,
                        fromCurrency: null,
                        toAmount: "100",
                        toContainer: containerId,
                        toCurrency: baseCurrencyId,
                    }
                ],
                tagIds: [],
                title: 'THIS IS A NEW TXN AFTER UPDATE',
                creationDate: Date.now() - 2.592e+10, // 300 days ago,
                description: ""
            };

            await createPutTransactionFunc({ targetTxnId: validTxnId1 })
            ({
                token: usrToken,
                asserts: 'default',
                body: [
                    'EXPECTED',
                    newTxnBody
                ]
            });

            const updatedTxn = (await createGetTransactionsFunc({ id: validTxnId1 })
            ( { token: usrToken, asserts: 'default' } )).parsedBody!.rangeItems[0];

            assertEquals(updatedTxn.changeInValue, "100");
            assertEquals(updatedTxn.description, "");
            assertEquals(updatedTxn.title, newTxnBody.title);
            assertEquals(updatedTxn.tagIds, newTxnBody.tagIds);
            assertEquals(
                JSON.stringify(sortDictionaryKeys(updatedTxn.fragments[0]), null, 4),
                JSON.stringify(sortDictionaryKeys(newTxnBody.fragments[0]), null, 4)
            );
            assertEquals(updatedTxn.fileIds, newTxnBody.fileIds);
            assertEquals(updatedTxn.creationDate, newTxnBody.creationDate);
        });

        await test.step(`Delete txns`, async test =>
        {
            let txnCountBeforeDeletion:number;
            await test.step("Record txn count before deletion", async () =>
            {
                const res = await createGetTransactionsFunc({})
                ({ token: usrToken, asserts: 'default' });
                txnCountBeforeDeletion = res.parsedBody?.totalItems!;
            });

            await createDelTransactionFunc({ id: validTxnId1 })
            ({ token: usrToken, asserts: 'default' });

            await test.step("Retrieve after deletion", async () =>
            {
                const res = await createGetTransactionsFunc({})
                ({ token: usrToken, asserts: 'default' });
                assertEquals(res.parsedBody?.totalItems!, txnCountBeforeDeletion - 1);
            });
        })
    },
    sanitizeOps: false,
    sanitizeResources: false
});