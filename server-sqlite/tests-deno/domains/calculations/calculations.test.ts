/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { createPostContainerFunc } from "../container/helpers.ts";
import { Decimal } from "decimal.js";
import { createPostTransactionFunc } from '../transaction/helpers.ts';
import { PostTxnAPIClass } from "../transaction/classes.ts";
import { randomUUID } from 'node:crypto';
import { createPostBaseCurrencyFunc } from "../currency/helpers.ts";
import { createGetExpensesAndIncomesFunc } from './helpers.ts';
import { assertEquals } from "@std/assert/equals";
import { createPostCurrencyFunc, createPostCurrencyRateDatumFunc } from '../currency/helpers.ts';
import { PostCurrencyRateAPI } from "../../../../api-types/currencyRateDatum.d.ts";
import { reverseMap } from '../../../server_source/db/servicesUtils.ts';
import { createGetBalanceHistoryFunc } from './helpers.ts';
import { assertsPrettyJSON } from '../../lib/assertions.ts';

const createBaseCurrWithAsserts = async (token: string, name: string, ticker: string) =>
{
    return (await createPostBaseCurrencyFunc()
    ({ token: token, asserts: 'default', body: [ 'EXPECTED', { name, ticker} ] })).parsedBody?.id!;
};

const createCurrAndRatesWithAsserts = async (
    { token, name, ticker, fallbackRate, fallbackRateCurrId, rates = [] } :
    {
        token: string,
        name: string,
        ticker: string,
        fallbackRate: string,
        fallbackRateCurrId: string,
        rates: { date: number, amount: string, refCurrencyId: string }[]
    }
) =>
{
    const postCurrencyBody =
    {
        name,
        ticker,
        fallbackRateAmount: fallbackRate,
        fallbackRateCurrencyId: fallbackRateCurrId
    };

    // Post Currency
    const currId = (await createPostCurrencyFunc()
    ({ token, asserts: 'default', body: [ 'EXPECTED', postCurrencyBody ] })).parsedBody?.id!;

    // Post Rate Datums
    for (const rate of rates)
    {
        const datumsBody: PostCurrencyRateAPI.RequestItemDTO[] =
        [
            {
                amount: rate.amount,
                date: rate.date,
                refAmountCurrencyId: rate.refCurrencyId,
                refCurrencyId: currId
            }
        ];

        await createPostCurrencyRateDatumFunc()
        ( { token, asserts: 'default', body: [ 'EXPECTED', { datums: datumsBody } ] } );
    }

    return { currencyId: currId }
};

const transformOffsetDate = (days: number, testDate: number) => Math.round(testDate - days * 8.64e+7);

const beforeEachSetup = async (
    { test, containerCounts } :
    { test: Deno.TestContext, containerCounts: number },
) =>
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

    const containerIds: string[] = [];
    for (let i = 0; i < containerCounts; i++)
    {
        await test.step(`Creating container ${i} for test`, async () =>
        {
            const container = await createPostContainerFunc()
            ({ token: testUserToken, asserts: 'default', body: ['EXPECTED', { name: `My Container ${i}` }] });
            containerIds.push(container.parsedBody?.id!);
        });
    }

    return {
        usrToken: testUserToken!,
        containerIds
    };
};

Deno.test(
{
    name: "Calculations - Expenses and Incomes Correctness",
    async fn(test)
    {
        type TestCaseFragment = { toAmount: Decimal|undefined, fromAmount: Decimal|undefined };
        type TestCase =
        {
            txnAgeDays: number,
            fragments: TestCaseFragment[],
            excludedFromExpensesIncomes: boolean
        };

        Decimal.set({ precision: 32 });
        const testDate = Date.now();
        await ensureTestIsSetup();
        await resetDatabase();
        const { containerIds, usrToken  } = await beforeEachSetup({ test, containerCounts: 4 });
        const baseCurrencyId = await createBaseCurrWithAsserts(usrToken, "Base", "BASE");

        const currentMonthStartEpoch = transformOffsetDate(30, testDate);
        const currentWeekStartEpoch = transformOffsetDate(7, testDate);
        const txnsToPost: TestCase[] =
        [
            {
                txnAgeDays: 90,
                fragments:
                [
                    { fromAmount: undefined              , toAmount: new Decimal(`100.0001`)  }
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 25,
                fragments:
                [
                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   },
                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   },
                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   },
                    { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)   }
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 20,
                fragments:
                [
                    { fromAmount: new Decimal(`20`)      , toAmount: new Decimal(`50`)   },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 18,
                fragments:
                [
                    { fromAmount: new Decimal(`0.0001`)  , toAmount: undefined   }
                ],
                excludedFromExpensesIncomes: true
            },
            {
                txnAgeDays: 6.9,
                fragments:
                [
                    { fromAmount: new Decimal(`0`)       , toAmount: undefined   },
                    { fromAmount: undefined              , toAmount: new Decimal(`12710`)   }
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 6.7,
                fragments:
                [
                    { fromAmount: new Decimal(`1820`)    , toAmount: undefined   }
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 1.5,
                fragments:
                [
                    { fromAmount: undefined              , toAmount: new Decimal(`78777`)   },
                    { fromAmount: new Decimal(`78777`)   , toAmount: new Decimal(`0`)   },
                    { fromAmount: new Decimal(`0`)       , toAmount: new Decimal(`78777`)   },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 0.3,
                fragments:
                [
                    { fromAmount: new Decimal(`1912.30`) , toAmount: undefined   }
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 0.1,
                fragments:
                [
                    { fromAmount: new Decimal(`192`)     , toAmount: new Decimal(`72727`)   }
                ],
                excludedFromExpensesIncomes: true
            },
            {
                txnAgeDays: 0,
                fragments:
                [
                    { fromAmount: new Decimal(`09037`)   , toAmount: undefined   }
                ],
                excludedFromExpensesIncomes: false
            },
        ];
        const expectedResult =
        {
            expenses30d: `12769.3`,
            incomes30d: `91517`,
            expenses7d: `12769.3`,
            incomes7d: `91487`,
            expensesCurrentMonth: `12769.3`,
            incomesCurrentMonth: `91517`,
            expensesCurrentWeek: `12769.3`,
            incomesCurrentWeek: `91487`
        };

        await test.step("Setup Transactions", async () =>
        {
            for (const txn of txnsToPost)
            {
                const txnBodyToPost: PostTxnAPIClass.RequestItemDTOClass =
                {
                    excludedFromIncomesExpenses: txn.excludedFromExpensesIncomes,
                    fileIds: [], fragments: [], tagIds: [],
                    description: randomUUID(), title: randomUUID(),
                    creationDate: transformOffsetDate(txn.txnAgeDays, testDate),
                };

                // Populate fragments to POST body
                for (const fragment of txn.fragments)
                {
                    const decimalToStr = (arg: Decimal | null | undefined) => arg?.toString() ?? null;
                    txnBodyToPost.fragments.push(
                    {
                        fromAmount: decimalToStr(fragment.fromAmount),
                        fromContainer: fragment.fromAmount === undefined ? null : containerIds[0],
                        fromCurrency: fragment.fromAmount === undefined ? null : baseCurrencyId,
                        toAmount: decimalToStr(fragment.toAmount),
                        toContainer: fragment.toAmount === undefined ? null : containerIds[0],
                        toCurrency: fragment.toAmount === undefined ? null : baseCurrencyId,
                    });
                }

                await createPostTransactionFunc()
                ({
                    token: usrToken,
                    asserts: 'default',
                    body: [ 'EXPECTED', { transactions: [ txnBodyToPost ] } ]
                });
            }
        });

        await test.step(`Reject requests without valid token`, async () =>
        {
            await createGetExpensesAndIncomesFunc({ currentMonthStartEpoch, currentWeekStartEpoch })
            ( { token: undefined, asserts: { status: 401 } } );

            await createGetExpensesAndIncomesFunc({ currentMonthStartEpoch, currentWeekStartEpoch })
            ( { token: usrToken + "_", asserts: { status: 401 } } );
        });

        await test.step(`Test for correctness`, async () =>
        {
            const res = await createGetExpensesAndIncomesFunc({ currentMonthStartEpoch, currentWeekStartEpoch })
            ( { token: usrToken, asserts: undefined } );

            assertEquals(JSON.stringify(expectedResult, null, 4), JSON.stringify(res.rawBodyJSON, null, 4));
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});


Deno.test(
{
    name: "Calculations - Balance History Correctness",
    async fn(test)
    {
        type TestCaseFragment =
        {
            toAmount: string|undefined,
            fromAmount: string|undefined,
            currencyId: string,
            containerId: string
        };
        type TestCase =
        {
            txnAgeDays: number,
            fragments: TestCaseFragment[],
            excludedFromExpensesIncomes: boolean
        };

        await ensureTestIsSetup();
        await resetDatabase();
        Decimal.set({ precision: 32 });
        const testDate = Date.now();
        const { containerIds, usrToken  } = await beforeEachSetup({ test, containerCounts: 4 });
        const baseCurrencyId = await createBaseCurrWithAsserts(usrToken, "Base", "BASE");
        const secondCurrency = await createCurrAndRatesWithAsserts(
        {
            fallbackRate: "1",
            fallbackRateCurrId: baseCurrencyId,
            name: "SEC",
            ticker: "SEC",
            rates: [],
            token: usrToken
        });
        const thirdCurrency = await createCurrAndRatesWithAsserts(
        {
            fallbackRate: "1",
            fallbackRateCurrId: secondCurrency.currencyId,
            name: "THI",
            ticker: "THI",
            rates: [],
            token: usrToken
        });

        const txnsToPost: TestCase[] =
        [
            {
                txnAgeDays: 90,
                fragments:
                [
                    { fromAmount: undefined  , toAmount: `100.0001`, currencyId: baseCurrencyId, containerId: containerIds[0] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 50,
                fragments:
                [
                    { fromAmount: `0.0001`   , toAmount: `0.0001`  , currencyId: baseCurrencyId, containerId: containerIds[1] },
                    { fromAmount: `0.0001`   , toAmount: `0.0001`  , currencyId: baseCurrencyId, containerId: containerIds[1] },
                    { fromAmount: `0.0001`   , toAmount: `0.0001`  , currencyId: baseCurrencyId, containerId: containerIds[1] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 18,
                fragments:
                [
                    { fromAmount: `0.0001`   , toAmount: undefined , currencyId: thirdCurrency.currencyId, containerId: containerIds[2] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 6.9,
                fragments:
                [
                    { fromAmount: `0`        , toAmount: undefined , currencyId: thirdCurrency.currencyId, containerId: containerIds[1] },
                    { fromAmount: undefined  , toAmount: `12710`   , currencyId: thirdCurrency.currencyId, containerId: containerIds[0] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 6.7,
                fragments:
                [
                    { fromAmount: `1820`     , toAmount: undefined , currencyId: baseCurrencyId, containerId: containerIds[0] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 1.5,
                fragments:
                [
                    { fromAmount: undefined  , toAmount: `78777`   , currencyId: secondCurrency.currencyId, containerId: containerIds[1] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 0.3,
                fragments:
                [
                    { fromAmount: `1912.30`  , toAmount: undefined, currencyId: baseCurrencyId, containerId: containerIds[2] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 0.1,
                fragments:
                [
                    { fromAmount: `192`      , toAmount: `72727`  , currencyId: secondCurrency.currencyId, containerId: containerIds[0] },
                ],
                excludedFromExpensesIncomes: false
            },
            {
                txnAgeDays: 0,
                fragments:
                [
                    { fromAmount: `09037`    , toAmount: undefined, currencyId: thirdCurrency.currencyId, containerId: containerIds[1] }
                ],
                excludedFromExpensesIncomes: false
            },
        ];

        await test.step("Setup Transactions", async () =>
        {
            for (const txn of txnsToPost)
            {
                const txnBodyToPost: PostTxnAPIClass.RequestItemDTOClass =
                {
                    excludedFromIncomesExpenses: txn.excludedFromExpensesIncomes,
                    fileIds: [], fragments: [], tagIds: [],
                    description: randomUUID(), title: randomUUID(),
                    creationDate: transformOffsetDate(txn.txnAgeDays, testDate),
                };

                // Populate fragments to POST body
                for (const fragment of txn.fragments)
                {
                    txnBodyToPost.fragments.push(
                    {
                        fromAmount: fragment.fromAmount ?? null,
                        fromContainer: fragment.fromAmount === undefined ? null : fragment.containerId,
                        fromCurrency: fragment.fromAmount === undefined ? null : fragment.currencyId,
                        toAmount: fragment.toAmount ?? null,
                        toContainer: fragment.toAmount === undefined ? null : fragment.containerId,
                        toCurrency: fragment.toAmount === undefined ? null : fragment.currencyId,
                    });
                }

                await createPostTransactionFunc()
                ({
                    token: usrToken,
                    asserts: 'default',
                    body: [ 'EXPECTED', { transactions: [ txnBodyToPost ] } ]
                });
            }
        });

        await test.step(`Test for Correctness`, async () =>
        {
            const rangeStart = 59;
            const rangeEnd = -10;
            const division = 10;
            const divideTime = (index: number) => rangeStart + (rangeEnd - rangeStart) / (division - 1) * index;

            const expectedDivisionValues =
            {
                0: { [baseCurrencyId]: "100.0001" },
                1: { [baseCurrencyId]: "100.0001" },
                2: { [baseCurrencyId]: "100.0001" },
                3: { [baseCurrencyId]: "100.0001" },
                4: { [baseCurrencyId]: "100.0001" },
                5: { [baseCurrencyId]: "100.0001" },
                6:
                {
                    [baseCurrencyId]: "100.0001",
                    [thirdCurrency.currencyId]: "-0.0001"
                },
                7:
                {
                    [baseCurrencyId]: "-1719.9999",
                    [thirdCurrency.currencyId]: "12709.9999"
                },
                8:
                {
                    [baseCurrencyId]: "-3632.2999",
                    [thirdCurrency.currencyId]: "3672.9999",
                    [secondCurrency.currencyId]: "151312",
                },
                9:
                {
                    [baseCurrencyId]: "-3632.2999",
                    [thirdCurrency.currencyId]: "3672.9999",
                    [secondCurrency.currencyId]: "151312",
                }
            };

            const expectedJSON =
            {
                map: reverseMap
                (
                    Object.entries(expectedDivisionValues).map(division =>
                    {
                        const time = transformOffsetDate(divideTime(parseInt(division[0])), testDate).toString();
                        return [time, division[1]];
                    }
                ))
            };

            // Get the balance history from server
            const balanceHistory = await createGetBalanceHistoryFunc(
            {
                division: division,
                startDate: transformOffsetDate(rangeStart, testDate),
                endDate: transformOffsetDate(rangeEnd, testDate)
            })({ token: usrToken, asserts: 'default' });

            assertsPrettyJSON(balanceHistory.rawBodyJSON, expectedJSON);
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});