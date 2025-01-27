/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { createPostContainerFunc } from "../container/helpers.ts";
import { Decimal } from "decimal.js";
import { createGetExpensesAndIncomesFunc } from './helpers.ts';
import { assertEquals } from "@std/assert/equals";
import { reverseMap } from '../../../server_source/db/servicesUtils.ts';
import { createGetBalanceHistoryFunc } from './helpers.ts';
import { assertsPrettyJSON } from '../../lib/assertions.ts';
import { setupTxnsConCurrRates } from "../helpers.ts";

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
        Decimal.set({ precision: 32 });
        const testDate = Date.now();
        await ensureTestIsSetup();
        await resetDatabase();
        const { usrToken } = await beforeEachSetup({ test, containerCounts: 0 });
        await setupTxnsConCurrRates(
        {
            currencies: [ { _id: "Curr1", isBase: true, name: "Base", ticker: "Base" } ],
            containers: [ { _id: "Con1", name: "test" } ],
            rates: [],
            token: usrToken,
            transactions:
            [
                {
                    date: transformOffsetDate(90, testDate),
                    fragments: [ { to: { amount: "100.0001", containerId: "Con1", currencyId: "Curr1" } } ]
                },
                {
                    date: transformOffsetDate(25, testDate),
                    fragments: (() =>
                    {
                        const fragment =
                        {
                            to: { amount: "0.0001", containerId: "Con1", currencyId: "Curr1" },
                            from: { amount: "0.0001", containerId: "Con1", currencyId: "Curr1" }
                        };
                        return [ fragment, fragment, fragment, fragment ]
                    })()
                },
                {
                    date: transformOffsetDate(20, testDate),
                    fragments:
                    [
                        {
                            from: { amount: "20", containerId: "Con1", currencyId: "Curr1" },
                            to: { amount: "50", containerId: "Con1", currencyId: "Curr1" },
                        }
                    ]
                },
                {
                    date: transformOffsetDate(18, testDate),
                    fragments: [ { from: { amount: "0.0001", containerId: "Con1", currencyId: "Curr1" } } ],
                    excludedFromExpensesIncomes: true
                },
                {
                    date: transformOffsetDate(6.9, testDate),
                    fragments:
                    [
                        { from: { amount: "0", containerId: "Con1", currencyId: "Curr1" }, },
                        { to: { amount: "12710", containerId: "Con1", currencyId: "Curr1" }, }
                    ]
                },
                {
                    date: transformOffsetDate(6.7, testDate),
                    fragments: [ { from: { amount: "1820", containerId: "Con1", currencyId: "Curr1" }, } ],
                },
                {
                    date: transformOffsetDate(1.5, testDate),
                    fragments:
                    [
                        {
                            to: { amount: "78777", containerId: "Con1", currencyId: "Curr1" },
                        },
                        {
                            from: { amount: "78777", containerId: "Con1", currencyId: "Curr1" },
                            to: { amount: "0", containerId: "Con1", currencyId: "Curr1" },
                        },
                        {
                            from: { amount: "0", containerId: "Con1", currencyId: "Curr1" },
                            to: { amount: "78777", containerId: "Con1", currencyId: "Curr1" },
                        }
                    ],
                },
                {
                    date: transformOffsetDate(0.3, testDate),
                    fragments: [ { from: { amount: "1912.30", containerId: "Con1", currencyId: "Curr1" } } ],
                },
                {
                    date: transformOffsetDate(0.1, testDate),
                    fragments:
                    [
                        {
                            from: { amount: "192", containerId: "Con1", currencyId: "Curr1" },
                            to: { amount: "72727", containerId: "Con1", currencyId: "Curr1" }
                        }
                    ],
                    excludedFromExpensesIncomes: true
                },
                {
                    date: transformOffsetDate(0, testDate),
                    fragments: [ { from: { amount: "09037", containerId: "Con1", currencyId: "Curr1" } } ]
                }
            ]
        });

        const currentMonthStartEpoch = transformOffsetDate(30, testDate);
        const currentWeekStartEpoch = transformOffsetDate(7, testDate);
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

            assertsPrettyJSON(expectedResult, res.rawBodyJSON);
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
        await ensureTestIsSetup();
        await resetDatabase();
        Decimal.set({ precision: 32 });
        const testDate = Date.now();

        const { usrToken } = await beforeEachSetup({ test, containerCounts: 0 });
        const setupDetails = await setupTxnsConCurrRates(
        {
            containers:
            [
                { _id: "CONTAINER_1", name: "container 1" },
                { _id: "CONTAINER_2", name: "container 2" },
                { _id: "CONTAINER_3", name: "container 3" }
            ],
            currencies:
            [
                { _id: "CURRENCY_1", isBase: true, name: "base", ticker: "BASE" },
                { _id: "CURRENCY_2", isBase: false, fallbackRateAmount: "1", fallbackRateCurrId: "CURRENCY_1", name: "SEC", ticker: "SEC" },
                { _id: "CURRENCY_3", isBase: false, fallbackRateAmount: "1", fallbackRateCurrId: "CURRENCY_2", name: "THI", ticker: "THI" }
            ],
            rates: [],
            token: usrToken,
            transactions:
            [
                {
                    date: transformOffsetDate(90, testDate),
                    fragments: [ { to: { amount: "100.0001", currencyId: `CURRENCY_1`, containerId: `CONTAINER_1` } } ]
                },
                {
                    date: transformOffsetDate(50, testDate),
                    fragments:
                    [
                        {
                            from: { amount: "0.0001", currencyId: `CURRENCY_1`, containerId: `CONTAINER_2` },
                            to: { amount: "0.0001", currencyId: `CURRENCY_1`, containerId: `CONTAINER_2` }
                        },
                        {
                            from: { amount: "0.0001", currencyId: `CURRENCY_1`, containerId: `CONTAINER_2` },
                            to: { amount: "0.0001", currencyId: `CURRENCY_1`, containerId: `CONTAINER_2` }
                        },
                        {
                            from: { amount: "0.0001", currencyId: `CURRENCY_1`, containerId: `CONTAINER_2` },
                            to: { amount: "0.0001", currencyId: `CURRENCY_1`, containerId: `CONTAINER_2` }
                        }
                    ]
                },
                {
                    date: transformOffsetDate(18, testDate),
                    fragments: [ { from: { amount: "0.0001", currencyId: `CURRENCY_3`, containerId: `CONTAINER_3` } } ]
                },
                {
                    date: transformOffsetDate(6.9, testDate),
                    fragments:
                    [
                        { from: { amount: "0", currencyId: `CURRENCY_3`, containerId: `CONTAINER_2` } },
                        { to: { amount: "12710", currencyId: `CURRENCY_3`, containerId: `CONTAINER_1` } }
                    ]
                },
                {
                    date: transformOffsetDate(6.7, testDate),
                    fragments: [ { from: { amount: "1820", currencyId: `CURRENCY_1`, containerId: `CONTAINER_1` } } ]
                },
                {
                    date: transformOffsetDate(1.5, testDate),
                    fragments: [ { to: { amount: "78777", currencyId: `CURRENCY_2`, containerId: `CONTAINER_2` }, } ]
                },
                {
                    date: transformOffsetDate(0.3, testDate),
                    fragments: [ { from: { amount: "1912.30", currencyId: `CURRENCY_1`, containerId: `CONTAINER_3` } } ]
                },
                {
                    date: transformOffsetDate(0.1, testDate),
                    fragments:
                    [
                        {
                            from: { amount: "192", currencyId: `CURRENCY_2`, containerId: `CONTAINER_1` },
                            to: { amount: "72727", currencyId: `CURRENCY_2`, containerId: `CONTAINER_1` },
                        }
                    ]
                },
                {
                    date: transformOffsetDate(0, testDate),
                    fragments: [ { from: { amount: "09037", currencyId: `CURRENCY_3`, containerId: `CONTAINER_2` }, } ]
                }
            ]
        })
        const [baseCurrencyId, secondCurrencyId, thirdCurrencyId] = Object.values(setupDetails.currenciesMap).map(x => x.currencyId);

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
                    [thirdCurrencyId]: "-0.0001"
                },
                7:
                {
                    [baseCurrencyId]: "-1719.9999",
                    [thirdCurrencyId]: "12709.9999"
                },
                8:
                {
                    [baseCurrencyId]: "-3632.2999",
                    [thirdCurrencyId]: "3672.9999",
                    [secondCurrencyId]: "151312",
                },
                9:
                {
                    [baseCurrencyId]: "-3632.2999",
                    [thirdCurrencyId]: "3672.9999",
                    [secondCurrencyId]: "151312",
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