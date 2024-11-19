import { LinearInterpolator } from '../server_source/calculations/linearInterpolator.js';
import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { assertJSONEqual, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { Decimal } from "decimal.js";
import { randomUUID } from "crypto";
import { simpleFaker } from "@faker-js/faker";
import { GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI, ResponseGetExpensesAndIncomesDTO } from "../../api-types/calculations.js";
import { isDecimalJSString, IsDecimalJSString, IsEpochKeyedMap, IsPassing } from "../server_source/db/validators.js";
import { shuffleArray } from './lib/utils.js';
import { CurrencyHelpers, postCurrencyRateDatum } from './currency.test.js';
import { AuthHelpers } from './auth.test.js';
import { TransactionHelpers } from './transaction.test.js';
import { ContainerHelpers } from './container.test.js';
import { TxnTypeHelpers } from './txnType.test.js';

export namespace GetUserBalanceHistoryAPIClass
{
    export class ResponseDTO implements GetUserBalanceHistoryAPI.ResponseDTO
    {
        @IsEpochKeyedMap()
        @IsPassing(value =>
        {
            const val = value as { [epoch: string]: unknown };
            for (const innerMap of Object.values(val))
            {
                if (Object.keys(innerMap).some(k => typeof k !== 'string')) return false;
                if (Object.values(innerMap).some(v => !isDecimalJSString(v))) return false;
            }
            return true;
        })
        map: { [epoch: string]: { [currencyId: string]: string; }; };
    }
}

export namespace GetUserNetworthHistoryAPIClass
{
    export class ResponseDTO implements GetUserNetworthHistoryAPI.ResponseDTO
    {
        @IsEpochKeyedMap()
        @IsPassing(value =>
        {
            const val = value as { [epoch: string]: unknown };
            if (Object.keys(value).some(k => typeof k !== 'string')) return false;
            if (Object.values(value).some(v => !isDecimalJSString(v))) return false;
            return true;
        })
        map: { [epoch: string]: string; };
    }
}

export class ResponseGetExpensesAndIncomesDTOClass implements ResponseGetExpensesAndIncomesDTO
{
    @IsDecimalJSString() expenses30d: string;
    @IsDecimalJSString() incomes30d: string;
    @IsDecimalJSString() expenses7d: string;
    @IsDecimalJSString() incomes7d: string;
}

function choice<T> (list: T[]) { return list[Math.floor((Math.random()*list.length))]; }

export default async function(this: Context)
{
    Decimal.set({ precision: 32 });

    const testDate = Date.now();
    const transformOffsetDate = (x: number) => testDate - x * 8.64e+7;

    await this.module("Calculations", async function()
    {
        await this.module(UnitTestEndpoints.calculationsEndpoints.expensesAndIncomes, async function()
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
                        const txnTypes = await TxnTypeHelpers.postRandomTxnTypes({ ...baseConfig, txnCount: 3, });
                        const containers = await ContainerHelpers.postRandomContainers({ ...baseConfig, containerCount: 3 });
                        const baseCurrency = await CurrencyHelpers.postCreateCurrency({ ...baseConfig, body: { name: "BASE", ticker: "BASE" } });

                        const txnsToPost: { toAmount: Decimal|undefined, fromAmount: Decimal|undefined, txnAgeDays: number }[] =
                        [
                            { fromAmount: undefined              , toAmount: new Decimal(`100.0001`), txnAgeDays: 90  },
                            { fromAmount: new Decimal(`0.0001`)  , toAmount: new Decimal(`0.0001`)  , txnAgeDays: 50  },
                            { fromAmount: new Decimal(`0.0001`)  , toAmount: undefined              , txnAgeDays: 18  },
                            { fromAmount: new Decimal(`0`)       , toAmount: new Decimal(`12710`)   , txnAgeDays: 6.9 },
                            { fromAmount: new Decimal(`1820`)    , toAmount: undefined              , txnAgeDays: 6.7 },
                            { fromAmount: undefined              , toAmount: new Decimal(`78777`)   , txnAgeDays: 1.5 },
                            { fromAmount: new Decimal(`1912.30`) , toAmount: undefined              , txnAgeDays: 0.3 },
                            { fromAmount: new Decimal(`192`)     , toAmount: new Decimal(`72727`)   , txnAgeDays: 0.1 },
                            { fromAmount: new Decimal(`09037`)   , toAmount: undefined              , txnAgeDays: 0   }
                        ];
                        const expectedResult =
                        {
                            // expensesTotal: new Decimal(`12769.3001`),
                            // incomesTotal: new Decimal(`164122.0001`),
                            expenses30d: new Decimal(`12769.3001`),
                            incomes30d: new Decimal(`164022`),
                            expenses7d: new Decimal(`12769.3`),
                            incomes7d: new Decimal(`164022`)
                        };

                        for (const txnToPost of txnsToPost)
                        {
                            const isFrom = !!txnToPost.fromAmount;
                            const isTo = !!txnToPost.toAmount;

                            await TransactionHelpers.postCreateTransaction(
                            {
                                body:
                                {
                                    title: randomUUID(),
                                    creationDate: transformOffsetDate(txnToPost.txnAgeDays),
                                    description: simpleFaker.string.sample(100),
                                    fromAmount: isFrom ? txnToPost.fromAmount.toString() : undefined,
                                    fromContainerId: isFrom ? choice(containers).containerId : undefined,
                                    fromCurrencyId: isFrom ? baseCurrency.currencyId : undefined,
                                    toAmount: isTo ? txnToPost.toAmount.toString() : undefined,
                                    toContainerId: isTo ? choice(containers).containerId : undefined,
                                    toCurrencyId: isTo ? baseCurrency.currencyId : undefined,
                                    txnTypeId: choice(txnTypes).txnId
                                },
                                ...baseConfig
                            });
                        }

                        const userExpensesAndIncomes = await CalculationsHelpers.getUserExpensesAndIncomes(baseConfig);

                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expenses30d.toString(), expectedResult.expenses30d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expenses7d.toString(), expectedResult.expenses7d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomes30d.toString(), expectedResult.incomes30d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomes7d.toString(), expectedResult.incomes7d.toString());
                    }
                }, { timeout: 60000 });
            })
        });

        await this.module(UnitTestEndpoints.calculationsEndpoints.balanceHistory, async function ()
        {
            await resetDatabase();

            const makeCurrBody = (name: string, ticker: string, fallbackRateAmount: string, fallbackRateCurrencyId: string) =>
                ({ name, ticker, fallbackRateAmount, fallbackRateCurrencyId });

            const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const firstUserObj = Object.values(userCreds)[0];
            const baseConfig = { serverURL: serverURL, token: firstUserObj.token, assertBody: true, expectedCode: 200 };

            const txnTypes = await TxnTypeHelpers.postRandomTxnTypes({ txnCount: 3, ...baseConfig });
            const containers = await ContainerHelpers.postRandomContainers({ containerCount: 3, ...baseConfig });
            const baseCurrency = await CurrencyHelpers.postCreateCurrency({ body: { name: "BASE", ticker: "BASE" }, ...baseConfig });
            const secondCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("SEC", "SEC", '1', baseCurrency.currencyId), ...baseConfig });
            const thirdCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("THI", "THI", '1', secondCurrency.currencyId), ...baseConfig });
            const txnsToPost: { toAmount: string | undefined, fromAmount: string | undefined, txnAgeDays: number, currId: string, conId: string }[] =
            [
                { fromAmount: undefined, toAmount: `100.0001`, txnAgeDays: 90, currId: baseCurrency.currencyId, conId: containers[0].containerId },
                { fromAmount: `0.0001`, toAmount: `0.0001`, txnAgeDays: 50, currId: baseCurrency.currencyId, conId: containers[1].containerId },
                { fromAmount: `0.0001`, toAmount: undefined, txnAgeDays: 18, currId: thirdCurrency.currencyId, conId: containers[2].containerId },
                { fromAmount: `0`, toAmount: `12710`, txnAgeDays: 6.9, currId: thirdCurrency.currencyId, conId: containers[1].containerId },
                { fromAmount: `1820`, toAmount: undefined, txnAgeDays: 6.7, currId: baseCurrency.currencyId, conId: containers[0].containerId },
                { fromAmount: undefined, toAmount: `78777`, txnAgeDays: 1.5, currId: secondCurrency.currencyId, conId: containers[1].containerId },
                { fromAmount: `1912.30`, toAmount: undefined, txnAgeDays: 0.3, currId: baseCurrency.currencyId, conId: containers[2].containerId },
                { fromAmount: `192`, toAmount: `72727`, txnAgeDays: 0.1, currId: secondCurrency.currencyId, conId: containers[0].containerId },
                { fromAmount: `09037`, toAmount: undefined, txnAgeDays: 0, currId: thirdCurrency.currencyId, conId: containers[1].containerId }
            ];

            shuffleArray(txnsToPost);

            // Start posting defined test transactions to server
            for (const txnToPost of txnsToPost)
            {
                const isFrom = !!txnToPost.fromAmount;
                const isTo = !!txnToPost.toAmount;

                await TransactionHelpers.postCreateTransaction
                (
                    {
                        body:
                        {
                            title: randomUUID(),
                            creationDate: transformOffsetDate(txnToPost.txnAgeDays),
                            description: simpleFaker.string.sample(100),
                            fromAmount: isFrom ? txnToPost.fromAmount : undefined,
                            fromContainerId: isFrom ? txnToPost.conId : undefined,
                            fromCurrencyId: isFrom ? txnToPost.currId : undefined,
                            toAmount: isTo ? txnToPost.toAmount : undefined,
                            toContainerId: isTo ? txnToPost.conId : undefined,
                            toCurrencyId: isTo ? txnToPost.currId : undefined,
                            txnTypeId: choice(txnTypes).txnId
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

        await this.module(UnitTestEndpoints.calculationsEndpoints.networthHistory, async function ()
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
            const txnTypes = await TxnTypeHelpers.postRandomTxnTypes({ txnCount: 3, ...baseConfig });
            const containers = await ContainerHelpers.postRandomContainers({ containerCount: 3, ...baseConfig });
            const baseCurrency = await CurrencyHelpers.postCreateCurrency({ body: { name: "BASE", ticker: "BASE" }, ...baseConfig });
            const secondCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("SEC", "SEC", '1', baseCurrency.currencyId), ...baseConfig });
            const thirdCurrency = await CurrencyHelpers.postCreateCurrency({ body: makeCurrBody("THI", "THI", '1', secondCurrency.currencyId), ...baseConfig });
            const txnsToPost: { toAmount: string | undefined, fromAmount: string | undefined, txnAgeDays: number, currId: string, conId: string }[] =
            [
                { fromAmount: undefined  , toAmount: `100.0001` , txnAgeDays: 90, currId: baseCurrency.currencyId   , conId: containers[0].containerId },
                { fromAmount: `0.0001`   , toAmount: `0.0001`   , txnAgeDays: 85, currId: baseCurrency.currencyId   , conId: containers[1].containerId },
                { fromAmount: `0.0001`   , toAmount: undefined  , txnAgeDays: 65, currId: thirdCurrency.currencyId  , conId: containers[2].containerId },
                { fromAmount: `0`        , toAmount: `12710`    , txnAgeDays: 60, currId: thirdCurrency.currencyId  , conId: containers[1].containerId },
                { fromAmount: `1820`     , toAmount: undefined  , txnAgeDays: 40, currId: baseCurrency.currencyId   , conId: containers[0].containerId },
                { fromAmount: undefined  , toAmount: `78777`    , txnAgeDays: 32, currId: secondCurrency.currencyId , conId: containers[1].containerId },
                { fromAmount: `1912.30`  , toAmount: undefined  , txnAgeDays: 18, currId: baseCurrency.currencyId   , conId: containers[2].containerId },
                { fromAmount: `192`      , toAmount: `72727`    , txnAgeDays: 9 , currId: secondCurrency.currencyId , conId: containers[0].containerId },
                { fromAmount: `09037`    , toAmount: undefined  , txnAgeDays: 0 , currId: thirdCurrency.currencyId  , conId: containers[1].containerId }
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
                const isFrom = !!txnToPost.fromAmount;
                const isTo = !!txnToPost.toAmount;

                await TransactionHelpers.postCreateTransaction
                (
                    {
                        body:
                        {
                            title: randomUUID(),
                            creationDate: transformOffsetDate(txnToPost.txnAgeDays),
                            description: simpleFaker.string.sample(100),
                            fromAmount: isFrom ? txnToPost.fromAmount : undefined,
                            fromContainerId: isFrom ? txnToPost.conId : undefined,
                            fromCurrencyId: isFrom ? txnToPost.currId : undefined,
                            toAmount: isTo ? txnToPost.toAmount : undefined,
                            toContainerId: isTo ? txnToPost.conId : undefined,
                            toCurrencyId: isTo ? txnToPost.currId : undefined,
                            txnTypeId: choice(txnTypes).txnId
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
}

export namespace CalculationsHelpers
{
    export async function getUserExpensesAndIncomes(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            UnitTestEndpoints.calculationsEndpoints['expensesAndIncomes'],
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? ResponseGetExpensesAndIncomesDTOClass : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }

    export async function getUserBalanceHistory(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        startDate: number,
        endDate: number,
        division: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.calculationsEndpoints['balanceHistory']}?startDate=${config.startDate}&endDate=${config.endDate}&division=${config.division}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetUserBalanceHistoryAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }

    export async function getUserNetworthHistory(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        startDate: number,
        endDate: number,
        division: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.calculationsEndpoints['networthHistory']}?startDate=${config.startDate}&endDate=${config.endDate}&division=${config.division}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetUserNetworthHistoryAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }
}