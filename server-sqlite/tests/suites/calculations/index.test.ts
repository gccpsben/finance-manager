import { LinearInterpolator } from '../../../server_source/calculations/linearInterpolator.js';
import { resetDatabase, serverURL, TESTS_ENDPOINTS } from "../../index.test.js";
import { assertJSONEqual, assertStrictEqual } from "../../lib/assert.js";
import { Context } from "../../lib/context.js";
import { Decimal } from "decimal.js";
import { randomUUID } from "crypto";
import { simpleFaker } from "@faker-js/faker";
import { GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI } from "../../../../api-types/calculations.js";
import { shuffleArray } from '../../lib/utils.js';
import { AuthHelpers } from '../auth/helpers.js';
import { CalculationsHelpers } from './helpers.js';
import { ContainerHelpers } from '../container/helpers.js';
import { TransactionHelpers } from '../transaction/helpers.js';
import { CurrencyHelpers } from '../currency/helpers.js';
import { TxnTagHelpers } from '../txnTag/helpers.js';
import { postCurrencyRateDatum } from '../currency/index.test.js';
import { LinearStepper } from '../../../server_source/calculations/linearStepper.js';
import { LinearInterpolatorVirtual } from '../../../server_source/calculations/linearInterpolatorVirtual.js';

function choice<T> (list: T[]) { return list[Math.floor((Math.random()*list.length))]; }

export default async function(this: Context)
{
    Decimal.set({ precision: 32 });

    const testDate = Date.now();
    const transformOffsetDate = (x: number) => testDate - x * 8.64e+7;

    await this.module("Calculations", async function()
    {
        await this.module(TESTS_ENDPOINTS['calculations-expensesAndIncomes']['get'], async function()
        {
            await resetDatabase();

            await this.describe(`get`, async function()
            {
                await this.test(`Test for Correctness`, async function()
                {
                    const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 3);

                    for (const [userKeyname, userObj] of Object.entries(userCreds))
                    {
                        const baseConfig = { serverURL, token: userObj.token, assertBody: true, expectedCode: 200 };
                        const txnTypes = await TxnTagHelpers.postRandomTxnTags({ ...baseConfig, txnCount: 3, });
                        const containers = await ContainerHelpers.postRandomContainers({ ...baseConfig, containerCount: 3 });
                        const baseCurrency = await CurrencyHelpers.postCreateCurrency({ ...baseConfig, body: { name: "BASE", ticker: "BASE" } });

                        const currentMonthStartEpoch = transformOffsetDate(30);
                        const currentWeekStartEpoch = transformOffsetDate(7);
                        const txnsToPost: {
                            txnAgeDays: number,
                            fragments: {
                                toAmount: Decimal|undefined,
                                fromAmount: Decimal|undefined,
                            }[],
                            excludedFromExpensesIncomes: boolean
                        }[] =
                        [
                            {
                                txnAgeDays: 90, fragments: [
                                    { fromAmount: undefined              , toAmount: new Decimal(`100.0001`)  }
                                ],
                                excludedFromExpensesIncomes: false
                            },
                            {
                                txnAgeDays: 25, fragments: [
                                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   },
                                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   },
                                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   },
                                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   }
                                ],
                                excludedFromExpensesIncomes: false
                            },
                            {
                                txnAgeDays: 20, fragments: [
                                    { fromAmount: new Decimal(`20`)  , toAmount: new Decimal(`50`)   },
                                ],
                                excludedFromExpensesIncomes: false
                            },
                            {
                                txnAgeDays: 18, fragments: [
                                    { fromAmount: new Decimal(`0.0001`)  , toAmount: undefined   }
                                ],
                                excludedFromExpensesIncomes: true
                            },
                            {
                                txnAgeDays: 6.9, fragments: [
                                    { fromAmount: new Decimal(`0`)       , toAmount: undefined   },
                                    { fromAmount: undefined             , toAmount: new Decimal(`12710`)   }
                                ],
                                excludedFromExpensesIncomes: false
                            },
                            {
                                txnAgeDays: 6.7, fragments: [
                                    { fromAmount: new Decimal(`1820`)    , toAmount: undefined   }
                                ],
                                excludedFromExpensesIncomes: false
                            },
                            {
                                txnAgeDays: 1.5, fragments: [
                                    { fromAmount: undefined              , toAmount: new Decimal(`78777`)   },
                                    { fromAmount: new Decimal(`78777`)   , toAmount: new Decimal(`0`)   },
                                    { fromAmount: new Decimal(`0`)       , toAmount: new Decimal(`78777`)   },
                                ],
                                excludedFromExpensesIncomes: false
                            },
                            {
                                txnAgeDays: 0.3, fragments: [
                                    { fromAmount: new Decimal(`1912.30`) , toAmount: undefined   }
                                ],
                                excludedFromExpensesIncomes: false
                            },
                            {
                                txnAgeDays: 0.1, fragments: [
                                    { fromAmount: new Decimal(`192`)     , toAmount: new Decimal(`72727`)   }
                                ],
                                excludedFromExpensesIncomes: true
                            },
                            {
                                txnAgeDays: 0, fragments: [
                                    { fromAmount: new Decimal(`09037`)   , toAmount: undefined   }
                                ],
                                excludedFromExpensesIncomes: false
                            },
                        ];
                        const expectedResult =
                        {
                            expenses30d: new Decimal(`12769.3`),
                            incomes30d: new Decimal(`91517`),
                            expenses7d: new Decimal(`12769.3`),
                            incomes7d: new Decimal(`91487`),
                            expensesWeek: new Decimal(`12769.3`),
                            incomesWeek: new Decimal(`91487`),
                            expensesMonth: new Decimal(`12769.3`),
                            incomesMonth: new Decimal(`91517`),
                        };

                        // Start posting defined test transactions to server
                        for (const txnToPost of txnsToPost)
                        {
                            await TransactionHelpers.postCreateTransaction
                            (
                                {
                                    body:
                                    {
                                        transactions:
                                        [
                                            {
                                                title: randomUUID(),
                                                creationDate: transformOffsetDate(txnToPost.txnAgeDays),
                                                description: simpleFaker.string.sample(100),
                                                fragments: txnToPost.fragments.map(f => {
                                                    const isFrom = !!f.fromAmount;
                                                    const isTo = !!f.toAmount;

                                                    return {
                                                        fromAmount: isFrom ? f.fromAmount.toString() : undefined,
                                                        fromContainer: isFrom ? choice(containers).containerId : undefined,
                                                        fromCurrency: isFrom ? baseCurrency.currencyId : undefined,
                                                        toAmount: isTo ? f.toAmount.toString() : undefined,
                                                        toContainer: isTo ? choice(containers).containerId : undefined,
                                                        toCurrency: isTo ? baseCurrency.currencyId : undefined,
                                                    }
                                                }),
                                                tagIds: [choice(txnTypes).txnId],
                                                excludedFromIncomesExpenses: txnToPost.excludedFromExpensesIncomes,
                                                fileIds: []
                                            }
                                        ]
                                    },
                                    ...baseConfig
                                }
                            );
                        }

                        const userExpensesAndIncomes = await CalculationsHelpers.getUserExpensesAndIncomes
                        (
                            {
                                ...baseConfig,
                                currentMonthStartEpoch: currentMonthStartEpoch,
                                currentWeekStartEpoch: currentWeekStartEpoch
                            }
                        );

                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expenses30d.toString(), expectedResult.expenses30d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expenses7d.toString(), expectedResult.expenses7d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomes30d.toString(), expectedResult.incomes30d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomes7d.toString(), expectedResult.incomes7d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomesCurrentMonth.toString(), expectedResult.incomesMonth.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomesCurrentWeek.toString(), expectedResult.incomesWeek.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expensesCurrentMonth.toString(), expectedResult.expensesMonth.toString());
                    }
                }, { timeout: 60000 });
            })
        });

        await this.module(TESTS_ENDPOINTS['calculations-balanceHistory']['getWithoutParams'](), async function ()
        {
            await resetDatabase();

            const makeCurrBody = (name: string, ticker: string, fallbackRateAmount: string, fallbackRateCurrencyId: string) =>
                ({ name, ticker, fallbackRateAmount, fallbackRateCurrencyId });

            const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const firstUserObj = Object.values(userCreds)[0];
            const baseConfig = { serverURL: serverURL, token: firstUserObj.token, assertBody: true, expectedCode: 200 };

            const txnTypes = await TxnTagHelpers.postRandomTxnTags({ txnCount: 3, ...baseConfig });
            const containers = await ContainerHelpers.postRandomContainers({ containerCount: 3, ...baseConfig });
            const baseCurrency = await CurrencyHelpers.postCreateCurrency({ body: { name: "BASE", ticker: "BASE" }, ...baseConfig });
            const secondCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("SEC", "SEC", '1', baseCurrency.currencyId), ...baseConfig });
            const thirdCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("THI", "THI", '1', secondCurrency.currencyId), ...baseConfig });
            const txnsToPost:
            {
                txnAgeDays: number,
                fragments:
                {
                    toAmount: string | undefined,
                    fromAmount: string | undefined,
                    currId: string,
                    conId: string
                }[]
            }[] =
            [
                {
                    txnAgeDays: 90,
                    fragments: [
                        { fromAmount: undefined  , toAmount: `100.0001`, currId: baseCurrency.currencyId, conId: containers[0].containerId },
                    ]
                },
                {
                    txnAgeDays: 50,
                    fragments: [
                        { fromAmount: `0.0001`   , toAmount: `0.0001`  , currId: baseCurrency.currencyId, conId: containers[1].containerId },
                        { fromAmount: `0.0001`   , toAmount: `0.0001`  , currId: baseCurrency.currencyId, conId: containers[1].containerId },
                        { fromAmount: `0.0001`   , toAmount: `0.0001`  , currId: baseCurrency.currencyId, conId: containers[1].containerId },
                    ]
                },
                {
                    txnAgeDays: 18,
                    fragments: [
                        { fromAmount: `0.0001`   , toAmount: undefined , currId: thirdCurrency.currencyId, conId: containers[2].containerId },
                    ]
                },
                {
                    txnAgeDays: 6.9,
                    fragments: [
                        { fromAmount: `0`        , toAmount: undefined , currId: thirdCurrency.currencyId, conId: containers[1].containerId },
                        { fromAmount: undefined  , toAmount: `12710`   , currId: thirdCurrency.currencyId, conId: containers[0].containerId },
                    ]
                },
                {
                    txnAgeDays: 6.7,
                    fragments: [
                        { fromAmount: `1820`     , toAmount: undefined , currId: baseCurrency.currencyId, conId: containers[0].containerId },
                    ]
                },
                {
                    txnAgeDays: 1.5,
                    fragments: [
                        { fromAmount: undefined  , toAmount: `78777`   , currId: secondCurrency.currencyId, conId: containers[1].containerId },
                    ]
                },
                {
                    txnAgeDays: 0.3,
                    fragments: [
                        { fromAmount: `1912.30`  , toAmount: undefined, currId: baseCurrency.currencyId, conId: containers[2].containerId },
                    ]
                },
                {
                    txnAgeDays: 0.1,
                    fragments: [
                        { fromAmount: `192`      , toAmount: `72727`  , currId: secondCurrency.currencyId, conId: containers[0].containerId },
                    ]
                },
                {
                    txnAgeDays: 0,
                    fragments: [
                        { fromAmount: `09037`    , toAmount: undefined, currId: thirdCurrency.currencyId, conId: containers[1].containerId }
                    ]
                },
            ];

            shuffleArray(txnsToPost);

            // Start posting defined test transactions to server
            for (const txnToPost of txnsToPost)
            {
                await TransactionHelpers.postCreateTransaction
                (
                    {
                        body:
                        {
                            transactions:
                            [
                                {
                                    title: randomUUID(),
                                    creationDate: transformOffsetDate(txnToPost.txnAgeDays),
                                    description: simpleFaker.string.sample(100),
                                    fragments: txnToPost.fragments.map(f => {
                                        const isFrom = !!f.fromAmount;
                                        const isTo = !!f.toAmount;

                                        return {
                                            fromAmount: isFrom ? f.fromAmount : undefined,
                                            fromContainer: isFrom ? f.conId : undefined,
                                            fromCurrency: isFrom ? f.currId : undefined,
                                            toAmount: isTo ? f.toAmount : undefined,
                                            toContainer: isTo ? f.conId : undefined,
                                            toCurrency: isTo ? f.currId : undefined,
                                        }
                                    }),
                                    tagIds: [choice(txnTypes).txnId],
                                    excludedFromIncomesExpenses: false,
                                    fileIds: []
                                }
                            ]
                        },
                        serverURL: serverURL, token: firstUserObj.token, assertBody: true, expectedCode: 200
                    }
                );
            }

            await this.describe(`get`, async function()
            {
                await this.test(`Forbid division is not an int`, async function()
                {
                    await CalculationsHelpers.getUserBalanceHistory(
                    {
                        serverURL: serverURL,
                        token: firstUserObj.token,
                        assertBody: false,
                        expectedCode: 400,
                        division: 5.2,
                        startDate: transformOffsetDate(100),
                        endDate: transformOffsetDate(0)
                    });
                });

                await this.test(`Forbid division === 1 or division === 0`, async function()
                {
                    await CalculationsHelpers.getUserBalanceHistory(
                    {
                        serverURL: serverURL,
                        token: firstUserObj.token,
                        assertBody: false,
                        expectedCode: 400,
                        division: 0,
                        startDate: transformOffsetDate(100),
                        endDate: transformOffsetDate(0)
                    });

                    await CalculationsHelpers.getUserBalanceHistory(
                    {
                        serverURL: serverURL,
                        token: firstUserObj.token,
                        assertBody: false,
                        expectedCode: 400,
                        division: 1,
                        startDate: transformOffsetDate(100),
                        endDate: transformOffsetDate(0)
                    });
                });

                await this.test(`Test for Correctness`, async function()
                {
                    const rangeStart = 59;
                    const rangeEnd = -10;
                    const division = 10;

                    const userBalances = await CalculationsHelpers.getUserBalanceHistory(
                    {
                        serverURL: serverURL, token: firstUserObj.token, assertBody: true, expectedCode: 200,
                        division: division,
                        startDate: transformOffsetDate(rangeStart), // 59 is chosen intentionally to check if txns outside the range is correctly included.
                        endDate: transformOffsetDate(rangeEnd)
                    });
                    const expectedJSON =
                    {
                        "map":
                        {
                            [transformOffsetDate(rangeStart)]:
                            {
                                [baseCurrency.currencyId]: "100.0001"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 1)]:
                            {
                                [baseCurrency.currencyId]: "100.0001"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 2)]:
                            {
                                [baseCurrency.currencyId]: "100.0001"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 3)]:
                            {
                                [baseCurrency.currencyId]: "100.0001"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 4)]:
                            {
                                [baseCurrency.currencyId]: "100.0001"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 5)]:
                            {
                                [baseCurrency.currencyId]: "100.0001"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 6)]:
                            {
                                [baseCurrency.currencyId]: "100.0001",
                                [thirdCurrency.currencyId]: "-0.0001"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 7)]:
                            {
                                [baseCurrency.currencyId]: "-1719.9999",
                                [thirdCurrency.currencyId]: "12709.9999"
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 8)]:
                            {
                                [baseCurrency.currencyId]: "-3632.2999",
                                [thirdCurrency.currencyId]: "3672.9999",
                                [secondCurrency.currencyId]: "151312",
                            },
                            [transformOffsetDate(rangeStart + (rangeEnd - rangeStart) / (division - 1) * 9)]:
                            {
                                [baseCurrency.currencyId]: "-3632.2999",
                                [thirdCurrency.currencyId]: "3672.9999",
                                [secondCurrency.currencyId]: "151312",
                            }
                        }
                    } satisfies GetUserBalanceHistoryAPI.ResponseDTO;

                    assertJSONEqual(userBalances.res.parsedBody, expectedJSON);
                })
            });
        });

        await this.module(TESTS_ENDPOINTS['calculations-networthHistory']['getWithoutParams'](), async function ()
        {
            await resetDatabase();

            const makeCurrBody = (name: string, ticker: string, fallbackRateAmount: string, fallbackRateCurrencyId: string) =>
                ({ name, ticker, fallbackRateAmount, fallbackRateCurrencyId });

            const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const firstUserObj = Object.values(userCreds)[0];
            const baseConfig = { serverURL: serverURL, token: firstUserObj.token, assertBody: true, expectedCode: 200 };

            const rangeStart = 100;
            const rangeEnd = 0;
            const division = 10;
            const txnTypes = await TxnTagHelpers.postRandomTxnTags({ txnCount: 3, ...baseConfig });
            const containers = await ContainerHelpers.postRandomContainers({ containerCount: 3, ...baseConfig });
            const baseCurrency = await CurrencyHelpers.postCreateCurrency({ body: { name: "BASE", ticker: "BASE" }, ...baseConfig });
            const secondCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("SEC", "SEC", '1', baseCurrency.currencyId), ...baseConfig });
            const thirdCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("THI", "THI", '1', secondCurrency.currencyId), ...baseConfig });
            const txnsToPost:
            {
                txnAgeDays: number,
                fragments:
                {
                    toAmount: string | undefined,
                    fromAmount: string | undefined,
                    currId: string,
                    conId: string
                }[]
            }[] =
            [
                {
                    txnAgeDays: 90,
                    fragments: [
                        { fromAmount: undefined  , toAmount: `100.0001`, currId: baseCurrency.currencyId   , conId: containers[0].containerId }
                    ]
                },
                {
                    txnAgeDays: 85,
                    fragments: [
                        { fromAmount: `0.0001`   , toAmount: `0.0001`  , currId: baseCurrency.currencyId   , conId: containers[1].containerId },
                        { fromAmount: `0.0001`   , toAmount: `0.0001`  , currId: baseCurrency.currencyId   , conId: containers[1].containerId },
                        { fromAmount: `0.0001`   , toAmount: `0.0001`  , currId: baseCurrency.currencyId   , conId: containers[1].containerId },
                        { fromAmount: `0.0001`   , toAmount: `0.0001`  , currId: baseCurrency.currencyId   , conId: containers[1].containerId }
                    ]
                },
                {
                    txnAgeDays: 65,
                    fragments: [
                        { fromAmount: `0.0001`   , toAmount: undefined , currId: thirdCurrency.currencyId  , conId: containers[2].containerId }
                    ]
                },
                {
                    txnAgeDays: 60,
                    fragments: [
                        { fromAmount: `0`        , toAmount: `12710`   , currId: thirdCurrency.currencyId  , conId: containers[1].containerId }
                    ]
                },
                {
                    txnAgeDays: 40,
                    fragments: [
                        { fromAmount: `1820`     , toAmount: undefined , currId: baseCurrency.currencyId   , conId: containers[0].containerId }
                    ]
                },
                {
                    txnAgeDays: 32,
                    fragments: [
                        { fromAmount: undefined  , toAmount: `78777`   , currId: secondCurrency.currencyId , conId: containers[1].containerId }
                    ]
                },
                {
                    txnAgeDays: 18,
                    fragments: [
                        { fromAmount: `1912.30`  , toAmount: undefined , currId: baseCurrency.currencyId   , conId: containers[2].containerId }
                    ]
                },
                {
                    txnAgeDays: 9,
                    fragments: [
                        { fromAmount: `192`      , toAmount: undefined , currId: secondCurrency.currencyId , conId: containers[1].containerId },
                        { fromAmount: undefined  , toAmount: `72727`   , currId: secondCurrency.currencyId , conId: containers[0].containerId }
                    ]
                },
                {
                    txnAgeDays: 0,
                    fragments: [
                        { fromAmount: `09037`    , toAmount: undefined , currId: thirdCurrency.currencyId  , conId: containers[1].containerId }
                    ]
                },
            ];
            const ratesDatums =
            [
                { datumAgeDays: 100, amount: "0.06"   , refAmountCurrency: baseCurrency   , refCurrency: secondCurrency },
                { datumAgeDays: 78,  amount: "0.05"   , refAmountCurrency: baseCurrency   , refCurrency: secondCurrency },
                { datumAgeDays: 48,  amount: "0.04"   , refAmountCurrency: baseCurrency   , refCurrency: secondCurrency },
                { datumAgeDays: 15,  amount: "0.1"    , refAmountCurrency: baseCurrency   , refCurrency: secondCurrency },

                { datumAgeDays: 78,  amount: "78"     , refAmountCurrency: baseCurrency   , refCurrency: thirdCurrency },
                { datumAgeDays: 32,  amount: "770"    , refAmountCurrency: secondCurrency , refCurrency: thirdCurrency },
                { datumAgeDays: 10,  amount: "147.22" , refAmountCurrency: baseCurrency   , refCurrency: thirdCurrency },
                { datumAgeDays: 0,   amount: "1111"   , refAmountCurrency: secondCurrency , refCurrency: thirdCurrency },
            ];

            shuffleArray(txnsToPost);
            shuffleArray(ratesDatums);

            // Start posting defined test transactions to server
            for (const txnToPost of txnsToPost)
            {
                await TransactionHelpers.postCreateTransaction
                (
                    {
                        body:
                        {
                            transactions:
                            [
                                {
                                    title: randomUUID(),
                                    creationDate: transformOffsetDate(txnToPost.txnAgeDays),
                                    description: simpleFaker.string.sample(100),
                                    fragments: txnToPost.fragments.map(f => {
                                        const isFrom = !!f.fromAmount;
                                        const isTo = !!f.toAmount;

                                        return {
                                            fromAmount: isFrom ? f.fromAmount : undefined,
                                            fromContainer: isFrom ? f.conId : undefined,
                                            fromCurrency: isFrom ? f.currId : undefined,
                                            toAmount: isTo ? f.toAmount : undefined,
                                            toContainer: isTo ? f.conId : undefined,
                                            toCurrency: isTo ? f.currId : undefined,
                                        }
                                    }),
                                    tagIds: [choice(txnTypes).txnId],
                                    excludedFromIncomesExpenses: false,
                                    fileIds: []
                                }
                            ]
                        },
                        serverURL: serverURL, token: firstUserObj.token, assertBody: true, expectedCode: 200
                    }
                );
            }

            // Start posting defined currency rate datums to server
            for (const datum of ratesDatums)
            {
                const response = await postCurrencyRateDatum
                (
                    firstUserObj.token,
                    datum.amount,
                    datum.refCurrency.currencyId,
                    datum.refAmountCurrency.currencyId,
                    transformOffsetDate(datum.datumAgeDays)
                );
                assertStrictEqual(response.res.status, 200);
            }

            await this.describe(`get`, async function()
            {
                await this.test(`Forbid division is not an int`, async function()
                {
                    await CalculationsHelpers.getUserNetworthHistory(
                    {
                        serverURL: serverURL,
                        token: firstUserObj.token,
                        assertBody: false,
                        expectedCode: 400,
                        division: 5.2,
                        startDate: transformOffsetDate(rangeStart),
                        endDate: transformOffsetDate(rangeEnd)
                    });
                });

                await this.test(`Forbid division === 1 or division === 0`, async function()
                {
                    await CalculationsHelpers.getUserNetworthHistory(
                    {
                        serverURL: serverURL,
                        token: firstUserObj.token,
                        assertBody: false,
                        expectedCode: 400,
                        division: 0,
                        startDate: transformOffsetDate(100),
                        endDate: transformOffsetDate(0)
                    });

                    await CalculationsHelpers.getUserNetworthHistory(
                    {
                        serverURL: serverURL,
                        token: firstUserObj.token,
                        assertBody: false,
                        expectedCode: 400,
                        division: 1,
                        startDate: transformOffsetDate(rangeStart),
                        endDate: transformOffsetDate(rangeEnd)
                    });
                });

                await this.test(`Test for Correctness`, async function()
                {
                    const divisionRangeInEpoch = (rangeEnd - rangeStart) / (division - 1);
                    const response = await CalculationsHelpers.getUserNetworthHistory(
                    {
                        serverURL: serverURL,
                        token: firstUserObj.token,
                        assertBody: true,
                        expectedCode: 200,
                        division: 10,
                        startDate: transformOffsetDate(rangeStart),
                        endDate: transformOffsetDate(rangeEnd)
                    });

                    const expectedJSON =
                    {
                        "map":
                        {
                            [transformOffsetDate(rangeStart)]: "0",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 1)]: "100.0001",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 2)]: "100.0001",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 3)]: "100.0001",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 4)]: "837682.85341342995169082125603865",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 5)]: "761545.65594483091787439613526571",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 6)]: "683588.45847623188405797101449275",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 7)]: "1212403.7784801212121212121212122",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 8)]: "1815058.3434286060606060606060607",
                            [transformOffsetDate(rangeStart + divisionRangeInEpoch * 9)]: "419569.18899",
                        }
                    } satisfies GetUserNetworthHistoryAPI.ResponseDTO;

                    assertJSONEqual(response.res.parsedBody, expectedJSON);
                });
            });
        });
    });
}

export async function testForCalculationsInternals(this: Context)
{
    await this.test(`Linear Interpolator Correctness `, async function()
    {
        await (async function()
        {
            const definedPoints =
            [
                { key: new Decimal(`0`), value: new Decimal(`0`) },
                { key: new Decimal(`1`), value: new Decimal(`100`) }
            ];
            const interpolator = LinearInterpolator.fromEntries(definedPoints, e => e.key, e => e.value);
            const expectedValues =
            [
                [ new Decimal(`-1`)     , undefined            ],
                [ new Decimal(`-0.1`)   , undefined            ],
                [ new Decimal(`0`)      , new Decimal(`0`)     ],
                [ new Decimal(`-0`)     , new Decimal(`0`)     ],
                [ new Decimal(`0.4111`) , new Decimal(`41.11`) ],
                [ new Decimal(`0.5`)    , new Decimal(`50`)    ],
                [ new Decimal(`1`)      , new Decimal(`100`)   ],
                [ new Decimal(`1.1`)    , undefined            ],
                [ new Decimal(`2`)      , undefined            ],
            ];

            for (const [ input, output ] of expectedValues)
            {
                let actualOutput = interpolator.getValue(input);
                assertStrictEqual(actualOutput ? actualOutput.toString() : undefined, output ? output.toString() : undefined)
            }

        }).bind(this)();

        await (async function()
        {
            const definedPoints =
            [
                { key: new Decimal(`-0.725`), value: new Decimal(`21.7`) },
                { key: new Decimal(`-0.08`) , value: new Decimal(`69.1`) },
                { key: new Decimal(`1.427`) , value: new Decimal(`89.4`) }
            ];
            const interpolator = LinearInterpolator.fromEntries(definedPoints, e => e.key, e => e.value);
            const expectedValues =
            [
                [ `-1`     , undefined                           ],
                [ `-0.3`   , `52.932558139534883720930232558139` ],
                [ `0.1`    , `71.524684804246848042468480424685` ],
                [ `0.2`    , `72.871731917717319177173191771732` ],
                [ `0.3`    , `74.218779031187790311877903118779` ],
                [ `0.4`    , `75.565826144658261446582614465826` ],
                [ `1`      , `83.648108825481088254810882548109` ],
                [ `1.5`    , undefined                           ],
                [ `-0.725` , `21.7`                              ],
                [ `-0.08`  , `69.1`                              ],
                [ `1.427`  , `89.4`                              ]
            ];
            for (const [ input, output ] of expectedValues)
            {
                let actualOutput = interpolator.getValue(new Decimal(input));
                assertStrictEqual(actualOutput ? actualOutput.toString() : undefined, output ? new Decimal(output).toString() : undefined)
            }
        }).bind(this)();
    });

    await this.test(`Linear Interpolator Virtual Correctness `, async function()
    {
        await (async function()
        {
            const definedPoints =
            [
                { key: new Decimal(`0`), value: new Decimal(`50`) },
                { key: new Decimal(`1`), value: new Decimal(`150`) }
            ];
            const interpolator = await LinearInterpolatorVirtual.fromEntries
            (
                definedPoints,
                e => new Promise<Decimal>(r => r(e.key)),
                e => new Promise<Decimal>(r =>
                {
                    setTimeout(
                        () => r(definedPoints.find(x => x.key === e)!.value.sub(50)),
                        Math.random() * 100
                    );
                })
            );
            const expectedValues =
            [
                [ new Decimal(`-1`)     , undefined            ],
                [ new Decimal(`-0.1`)   , undefined            ],
                [ new Decimal(`0`)      , new Decimal(`0`)     ],
                [ new Decimal(`-0`)     , new Decimal(`0`)     ],
                [ new Decimal(`0.4111`) , new Decimal(`41.11`) ],
                [ new Decimal(`0.5`)    , new Decimal(`50`)    ],
                [ new Decimal(`1`)      , new Decimal(`100`)   ],
                [ new Decimal(`1.1`)    , undefined            ],
                [ new Decimal(`2`)      , undefined            ],
            ];

            for (const [ input, output ] of expectedValues)
            {
                let actualOutput = await interpolator.getValue(input);
                assertStrictEqual(actualOutput ? actualOutput.toString() : undefined, output ? output.toString() : undefined)
            }

        }).bind(this)();

        await (async function()
        {
            const definedPoints =
            [
                { key: new Decimal(`-0.725`), value: new Decimal(`21.7`) },
                { key: new Decimal(`-0.08`) , value: new Decimal(`69.1`) },
                { key: new Decimal(`1.427`) , value: new Decimal(`89.4`) }
            ];
            const interpolator = LinearInterpolator.fromEntries(definedPoints, e => e.key, e => e.value);
            const expectedValues =
            [
                [ `-1`     , undefined                           ],
                [ `-0.3`   , `52.932558139534883720930232558139` ],
                [ `0.1`    , `71.524684804246848042468480424685` ],
                [ `0.2`    , `72.871731917717319177173191771732` ],
                [ `0.3`    , `74.218779031187790311877903118779` ],
                [ `0.4`    , `75.565826144658261446582614465826` ],
                [ `1`      , `83.648108825481088254810882548109` ],
                [ `1.5`    , undefined                           ],
                [ `-0.725` , `21.7`                              ],
                [ `-0.08`  , `69.1`                              ],
                [ `1.427`  , `89.4`                              ]
            ];
            for (const [ input, output ] of expectedValues)
            {
                let actualOutput = interpolator.getValue(new Decimal(input));
                assertStrictEqual(actualOutput ? actualOutput.toString() : undefined, output ? new Decimal(output).toString() : undefined)
            }
        }).bind(this)();
    });

    await this.test(`Linear Stepper Correctness`, async function()
    {
        const refTest = { test: 1, test3: 3 };
        const definedPoints =
        [
            { key: new Decimal("-10") , value: refTest },
            { key: new Decimal("-5")  , value: new Decimal("2") },
            { key: new Decimal("-1")  , value: { test: 1, test2: 2 } }, // value can be anything
            { key: new Decimal("0")   , value: new Decimal("1") },
            { key: new Decimal("0.1") , value: new Decimal("2") },
            { key: new Decimal("5")   , value: new Decimal("1.3") },
            { key: new Decimal("6")   , value: new Decimal("1.4") },
            { key: new Decimal("6")   , value: refTest },
            { key: new Decimal("9")   , value: new Decimal("-10") }
        ];
        const interpolator = LinearStepper.fromEntriesWithMapper<
        {
            key: Decimal,
            value: object | Decimal
        }, object | Decimal>(definedPoints, p => p);

        const expectedValues =
        [
            [-15    , 0          ],
            [-10    , refTest    ] as const,
            [-4     , 2          ],
            [-1     , { test: 1, test2: 2 }] as const,
            [-0.1   , { test: 1, test2: 2 }] as const,
            [0      , 1          ],
            [1      , 2          ],
            [2      , 2          ],
            [10     , -10        ],
            [6      , refTest    ] as const,
            [4.4    , 2          ]
        ];
        for (const [ input, output ] of expectedValues)
        {
            let actualOutput = interpolator.getValue(new Decimal(input), new Decimal(0));

            if (typeof output === 'number')
                assertStrictEqual(actualOutput.toString(), new Decimal(output).toString(), `input: ${input}`);
            else
                assertStrictEqual(JSON.stringify(actualOutput), JSON.stringify(output), `input: ${input}`);
        }
    });
}