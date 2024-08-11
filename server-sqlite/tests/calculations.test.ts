import { LinearInterpolator } from '../server_source/calculations/linearInterpolator.js';
import { resetDatabase, serverURL, UnitTestEndpoints } from "./index.test.js";
import { assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { HookShortcuts } from "./shortcuts/hookShortcuts.js";
import { Decimal } from "decimal.js";
import { randomUUID } from "crypto";
import { simpleFaker } from "@faker-js/faker";
import { ResponseGetExpensesAndIncomesDTO } from "../../api-types/calculations.js";
import { IsDecimalJSString } from "../server_source/db/validators.js";

export class ResponseGetExpensesAndIncomesDTOClass implements ResponseGetExpensesAndIncomesDTO
{
    @IsDecimalJSString() expensesTotal: string;
    @IsDecimalJSString() incomesTotal: string;
    @IsDecimalJSString() expenses30d: string;
    @IsDecimalJSString() incomes30d: string;
    @IsDecimalJSString() expenses7d: string;
    @IsDecimalJSString() incomes7d: string;
}

export default async function(this: Context)
{
    await resetDatabase();
    Decimal.set({ precision: 32 });

    await this.describe("Calculations", async function()
    {
        await this.describe(UnitTestEndpoints.calculationsEndpoints.expensesAndIncomes, async function()
        {
            await this.describe(`get`, async function()
            {
                await this.test(`Test for Correctness`, async function()
                {
                    function choice<T> (list: T[]) { return list[Math.floor((Math.random()*list.length))]; }
                    const userCreds = await HookShortcuts.registerRandMockUsers(serverURL, 3);
        
                    for (const [userKeyname, userObj] of Object.entries(userCreds))
                    {
                        // const baseConfig = { serverURL, token: userObj.token, assertBody: true, expectedCode: 200 };
                        const txnTypes = await HookShortcuts.postRandomTxnTypes(
                        {
                            serverURL: serverURL,
                            token: userObj.token,
                            txnCount: 3,
                            assertBody: true,
                            expectedCode: 200
                        });
                        const containers = await HookShortcuts.postRandomContainers(
                        {
                            serverURL: serverURL,
                            token: userObj.token,
                            containerCount: 3,
                            assertBody: true,
                            expectedCode: 200
                        });
                        const baseCurrency = await HookShortcuts.postCreateCurrency(
                        {
                            body: { name: "BASE", ticker: "BASE" },
                            serverURL: serverURL,
                            token: userObj.token,
                            assertBody: true,
                            expectedCode: 200
                        });
        
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
                            expensesTotal: new Decimal(`12769.3001`),
                            incomesTotal: new Decimal(`164122.0001`),
                            expenses30d: new Decimal(`12769.3001`),
                            incomes30d: new Decimal(`164022`),
                            expenses7d: new Decimal(`12769.3`),
                            incomes7d: new Decimal(`164022`)
                        };
        
                        for (const txnToPost of txnsToPost)
                        {
                            const isFrom = !!txnToPost.fromAmount;
                            const isTo = !!txnToPost.toAmount;
        
                            await HookShortcuts.postCreateTransaction(
                            {
                                body: 
                                { 
                                    title: randomUUID(),
                                    creationDate: Date.now() - txnToPost.txnAgeDays * 8.64e+7,
                                    description: simpleFaker.string.sample(100),
                                    fromAmount: isFrom ? txnToPost.fromAmount.toString() : undefined, 
                                    fromContainerId: isFrom ? choice(containers).containerId : undefined,
                                    fromCurrencyId: isFrom ? baseCurrency.currencyId : undefined,
                                    toAmount: isTo ? txnToPost.toAmount.toString() : undefined, 
                                    toContainerId: isTo ? choice(containers).containerId : undefined,
                                    toCurrencyId: isTo ? baseCurrency.currencyId : undefined,
                                    typeId: choice(txnTypes).txnId
                                },
                                serverURL: serverURL,
                                token: userObj.token,
                                assertBody: true,
                                expectedCode: 200
                            });   
                        }
        
                        const userExpensesAndIncomes = await HookShortcuts.getUserExpensesAndIncomes(
                        {
                            serverURL: serverURL,
                            token: userObj.token,
                            assertBody: true,
                            expectedCode: 200
                        });
        
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expenses30d.toString(), expectedResult.expenses30d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expenses7d.toString(), expectedResult.expenses7d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.expensesTotal.toString(), expectedResult.expensesTotal.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomes30d.toString(), expectedResult.incomes30d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomes7d.toString(), expectedResult.incomes7d.toString());
                        assertStrictEqual(userExpensesAndIncomes.res.parsedBody.incomesTotal.toString(), expectedResult.incomesTotal.toString());
                    }
                }, { timeout: 60000 });
            })
        })
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