import { IsString, IsBoolean, IsOptional, IsObject, IsDefined, IsNumber, IsArray, ValidateNested } from "class-validator";
import { IsDecimalJSString } from "../server_source/db/validators.js";
import { Context } from "./lib/context.js";
import { resetDatabase, serverURL, TestUserDict, TestUserEntry, UnitTestEndpoints } from "./index.test.js";
import { HookShortcuts } from "./shortcuts/hookShortcuts.js";
import { assertArrayAgainstModel, assertBodyConfirmToModel, assertEqual, AssertFetchConfig, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { simpleFaker } from '@faker-js/faker';
import { randomUUID } from "crypto";
import { Decimal } from "decimal.js";
import { fillArray } from "./lib/utils.js";
import { CurrencyDTO, PostCurrencyAPI, GetCurrencyAPI, GetCurrencyRateHistoryAPI } from "../../api-types/currencies.d.js";
import { PostCurrencyRateAPI } from "../../api-types/currencyRateDatum.js";
import { Type } from "class-transformer";

export class CurrencyDTOClass implements CurrencyDTO
{
    @IsString() id: string;
    @IsString() name: string;
    @IsOptional() @IsDecimalJSString() fallbackRateAmount: string;
    @IsOptional() @IsString() fallbackRateCurrencyId: string;
    @IsString() owner: string;
    @IsBoolean() isBase: boolean;
    @IsString() ticker: string;
    @IsDecimalJSString() rateToBase: string;
}

export namespace GetCurrencyAPIClass
{
    export class ResponseDTO implements GetCurrencyAPI.ResponseDTO
    {
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;
        
        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => CurrencyDTOClass)
        rangeItems: CurrencyDTO[];
    }
}

export namespace PostCurrencyAPIClass
{
    export class RequestDTO implements PostCurrencyAPI.RequestDTO
    {
        @IsString() name: string;
        @IsOptional() @IsDecimalJSString() fallbackRateAmount: string;
        @IsOptional() @IsString() fallbackRateCurrencyId: string;
        @IsString() ticker: string;
    }

    export class ResponseDTO implements PostCurrencyAPI.ResponseDTO
    {
        @IsString() id: string;
    }    
}

export namespace PostCurrencyRateDatumAPIClass
{
    export class RequestDTO implements PostCurrencyRateAPI.RequestDTO
    {
        @IsDecimalJSString() amount: string;
        @IsString() refCurrencyId: string;
        @IsString() refAmountCurrencyId: string;
        @IsNumber() date: number;
    }
    export class ResponseDTO implements PostCurrencyRateAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

function createBaseCurrencyPostBody(name: string, ticker: string)
{
    return { 
        name: name, 
        ticker: ticker, 
        fallbackRateCurrencyId: undefined, 
        fallbackRateAmount: undefined 
    } satisfies PostCurrencyAPI.RequestDTO;
}

function createCurrencyPostBody(name: string, ticker: string, refCurrencyId: string, amount: string)
{
    return { 
        name: name, 
        ticker: ticker, 
        fallbackRateCurrencyId: refCurrencyId, 
        fallbackRateAmount: amount 
    } satisfies PostCurrencyAPI.RequestDTO;
}

/** This does not perform assertion */
async function postBaseCurrency(token:string, name: string, ticker: string)
{
    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
    {
        baseURL: serverURL, expectedStatus: undefined, method: "POST",
        body: createBaseCurrencyPostBody(name, ticker),
        headers: { "authorization": token }
    });
    return response;
}

/** This does not perform assertion */
async function postCurrency(token:string, name: string, ticker: string, refCurrencyId: string, amount: string)
{
    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
    {
        baseURL: serverURL, expectedStatus: undefined, method: "POST",
        body: createCurrencyPostBody(name, ticker, refCurrencyId, amount),
        headers: { "authorization": token }
    });
    return response;
}

async function postCurrencyRateDatum(token:string, amount: string, refCurrencyId: string, refAmountCurrencyId: string, date: number)
{
    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currencyRateDatumsEndpoints['post'], 
    {
        baseURL: serverURL, expectedStatus: undefined, method: "POST",
        body: { amount, refCurrencyId, refAmountCurrencyId, date } as PostCurrencyRateDatumAPIClass.RequestDTO,
        headers: { "authorization": token }
    });
    return response;
}

/** This does not perform assertion */
async function getCurrencyById(token:string, id: string, date?: number|undefined)
{
    const response = await HTTPAssert.assertFetch
    (
        `${UnitTestEndpoints.currenciesEndpoints['get']}?id=${id}${date ? "&date=" + date : ""}`, 
        {
            baseURL: serverURL, expectedStatus: undefined, method: "GET",
            headers: { "authorization": token }
        }
    );
    return response;
}

export default async function(this: Context)
{
    await this.describe("Currencies", async function()
    {
        await baseCurrenciesCheck.bind(this)();
        await regularCurrenciesCheck.bind(this)();
        await ratesCorrectnessCheck.bind(this)();
    });
}

async function baseCurrenciesCheck(this: Context)
{
    await this.describe(`Base Currencies`, async function()
    {
        await resetDatabase();
        const testUsersCreds: TestUserDict = { "user1" : { username: "user1", password: "user1password" } };
        await HookShortcuts.registerMockUsers(serverURL, testUsersCreds);
        const user = testUsersCreds["user1"];

        await this.test(`Forbid base currencies without name - ${user.username}`, async function()
        {
            await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 400, method: "POST",
                body: { ticker: "USER-TICKER" },
                headers: { "authorization": user.token }
            });
        });

        await this.test(`Forbid create base Currencies without ticker - ${user.username}`, async function()
        {
            await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 400, method: "POST",
                body: { name: "CURR-NAME" },
                headers: { "authorization": user.token }
            });
        });

        await this.test(`Forbid create base Currencies without token`, async function()
        {
            await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 401, method: "POST",
                body: createBaseCurrencyPostBody(`User-Currency`, `USER-TICKER`)
            });
        });

        await this.test(`Allow base currencies with valid token and body`, async function()
        {
            await HookShortcuts.postCreateCurrency(
            {
               serverURL: serverURL,
               body: { name: `User-Currency`, ticker: "USER-TICKER" },
               token: user.token,
               assertBody: true,
               expectedCode: 200
            });
        });

        await this.test(`Forbid repeated base currencies`, async function()
        {
            await HookShortcuts.postCreateCurrency(
            {
                serverURL: serverURL,
                body: { name: `User-Currency`, ticker: "USER-TICKER" },
                token: user.token,
                assertBody: false,
                expectedCode: 400
            });
        });  
        
        await this.test(`Test for OwnerID and Name pri-subpri relationship (5x5)`, async function()
        {
            const relationshipMatrix = BodyGenerator.enumeratePrimarySubPrimaryMatrixUUID(5,5);
            const testUsersCreds: (TestUserEntry & { baseCurrencyId?: string })[] = relationshipMatrix.userIDs.map(user => (
            {
                password: `${user}password`,
                username: user,
            }));

            // Register users for each user in matrix
            await HookShortcuts.registerMockUsersArray(serverURL, testUsersCreds);

            // Create a base currency for each user first
            for (const user of testUsersCreds)
            {
                const response = await HookShortcuts.postCreateCurrency(
                {
                    serverURL: serverURL,
                    body: { name: `User-Currency`, ticker: "USER-TICKER" },
                    token: user.token,
                    assertBody: true,
                    expectedCode: 200
                });
                user.baseCurrencyId = response.currencyId;
            }

            for (const testCase of relationshipMatrix.matrix)
            {
                const userObj = testUsersCreds.find(x => x.username === testCase.primaryValue)!;
                const userToken = userObj.token;

                await HookShortcuts.postCreateCurrency(
                {
                    serverURL: serverURL,
                    body: { name: testCase.subPrimaryValue, ticker: testCase.subPrimaryValue, fallbackRateAmount: "1", fallbackRateCurrencyId: userObj.baseCurrencyId },
                    token: userToken,
                    assertBody: false,
                    expectedCode: testCase.expectedPass ? 200 : 400
                });
            }
        });
    });
}

async function regularCurrenciesCheck(this: Context)
{
    await this.describe(`Regular Currencies`, async function()
    {
        await resetDatabase();
        const testUsersCreds = await HookShortcuts.registerRandMockUsers(serverURL, 1);
        const firstUser = Object.values(testUsersCreds)[0];

        // Test for missing body params
        await (async function(this: Context)
        {
            // Register base currency for first user
            (async function()
            {
                const response = await HookShortcuts.postCreateCurrency(
                {
                    serverURL: serverURL,
                    body: { name: `User-Currency`, ticker: `USER-TICKER` },
                    token: firstUser.token,
                    assertBody: true,
                    expectedCode: 200
                });
                firstUser.baseCurrencyId = response.parsedBody.id;
            }).bind(this)();

            const getBaseObj = () => createCurrencyPostBody
            (
                `${firstUser.username}Currency`, 
                `${firstUser.username}_TICKER`, 
                firstUser.baseCurrencyId!, 
                "100"
            );

            // Generate missing field requests 
            for (const testCase of BodyGenerator.enumerateMissingField(getBaseObj()))
            {
                const missedField = testCase.fieldMissed;
                const obj = testCase.obj;   

                await this.test(`Forbid creating regular currencies without ${missedField} but all other fields`, async function () 
                {
                    await HookShortcuts.postCreateCurrency(
                    {
                        serverURL: serverURL,
                        body: { ...obj },
                        token: firstUser.token,
                        assertBody: false,
                        expectedCode: 400
                    });
                });
            }
        }).bind(this)();

        await this.test(`Forbid creating currencies with non-number amount`, async function () 
        {
            const testStrs = ["100a", "", "2e+3", "0x123", "***", ".../"];
            for (const str of testStrs)
            {
                await HookShortcuts.postCreateCurrency(
                {
                    serverURL: serverURL,
                    body: createCurrencyPostBody(`User-Currency`, `USER-TICKER`, firstUser.baseCurrencyId, str),
                    token: firstUser.token,
                    assertBody: false,
                    expectedCode: 400
                });
            }
        });

        const addedCurrenciesIDs: string[] = [];
        await this.test(`Allow creating currencies with floating point amount`, async function () 
        {
            const testStrs = fillArray(50, () => `${simpleFaker.number.float()}`);
            for (const str of testStrs)
            {
                const response = await HookShortcuts.postCreateCurrency(
                {
                    serverURL: serverURL,
                    body: createCurrencyPostBody(randomUUID(), randomUUID(), firstUser.baseCurrencyId, str),
                    token: firstUser.token,
                    assertBody: true,
                    expectedCode: 200
                });
                addedCurrenciesIDs.push(response.parsedBody.id);
            }
        });

        await this.test(`Check for missing props on the posted currencies`, async function () 
        {
            for (const cID of addedCurrenciesIDs)
            {
                await HTTPAssert.assertFetch
                (
                    `${UnitTestEndpoints.currenciesEndpoints['get']}?id=${cID}`, 
                    {
                        baseURL: serverURL, method: "GET", expectedStatus: 200,
                        headers: { "authorization": firstUser.token }
                    }
                )

                const response = await HTTPAssert.assertFetch
                (
                    `${UnitTestEndpoints.currenciesEndpoints['get']}?id=${cID}`, 
                    {
                        baseURL: serverURL, method: "GET", expectedStatus: 200,
                        headers: { "authorization": firstUser.token }
                    }
                );
                await assertBodyConfirmToModel(GetCurrencyAPIClass.ResponseDTO, response.rawBody);
            }

        }, { timeout: 60000 });
    });
}

async function ratesCorrectnessCheck(this:Context)
{
    const testDateTimestamp = Date.now();

    await this.describe(`Rates Correctness`, async function()
    {
        await this.describe(`Without Rates Datum`, async function()
        {
            await resetDatabase();
            const testUsersCreds = await HookShortcuts.registerRandMockUsers(serverURL, 1);
            const { username:firstUserName, token:firstUserToken } = Object.values(testUsersCreds)[0];
            const baseCurrencyResponse = await postBaseCurrency(firstUserToken, `${firstUserName}curr`, `${firstUserName}ticker`);
            const baseCurrencyID = baseCurrencyResponse.rawBody["id"] as string;
    
            await this.test(`Base Currency Rate should be 1`, async function()
            {
                const response = await getCurrencyById(firstUserToken, baseCurrencyID);
                HTTPAssert.assertStatus(200, response.res);
                const parsedBody = await assertBodyConfirmToModel(GetCurrencyAPIClass.ResponseDTO, response.rawBody);
                assertStrictEqual(parsedBody.rangeItems[0].rateToBase, "1");
            });
    
            const config = 
            {
                secondaryCurrencyID: undefined as undefined | string,
                ternaryCurrencyID: undefined as undefined | string,
                secondaryCurrencyAmount: new Decimal("7.27"),
                ternaryCurrencyAmount: new Decimal("7.27"),
                expectedSecondaryCurrencyAmount: new Decimal("7.27"),
                expectedTernaryCurrencyAmount: new Decimal("7.27").mul(new Decimal("7.27"))
            };

            // Register regular currencies
            await (async function()
            {
                const secondaryRes = await postCurrency(firstUserToken, randomUUID(), randomUUID(), baseCurrencyID, config.secondaryCurrencyAmount.toString());
                HTTPAssert.assertStatus(200, secondaryRes.res);
                await assertBodyConfirmToModel(PostCurrencyAPIClass.ResponseDTO, secondaryRes.rawBody);
                config.secondaryCurrencyID = secondaryRes.rawBody["id"];

                const ternaryRes = await postCurrency(firstUserToken, randomUUID(), randomUUID(), config.secondaryCurrencyID, config.ternaryCurrencyAmount.toString());
                HTTPAssert.assertStatus(200, ternaryRes.res);
                await assertBodyConfirmToModel(PostCurrencyAPIClass.ResponseDTO, ternaryRes.rawBody);
                config.ternaryCurrencyID = ternaryRes.rawBody["id"];
            }).bind(this)();

            await this.test(`Check if secondary currency rate is ${config.expectedSecondaryCurrencyAmount.toString()}`, async function()
            {
                const target = await getCurrencyById(firstUserToken, config.secondaryCurrencyID);
                HTTPAssert.assertStatus(200, target.res);
                const parsedBody = await assertBodyConfirmToModel(GetCurrencyAPIClass.ResponseDTO, target.rawBody);
                assertStrictEqual(parsedBody.rangeItems[0].rateToBase, config.expectedSecondaryCurrencyAmount.toString());
            });

            await this.test(`Check if ternary currency rate is ${config.expectedTernaryCurrencyAmount.toString()}`, async function()
            {
                const target = await getCurrencyById(firstUserToken, config.ternaryCurrencyID);
                HTTPAssert.assertStatus(200, target.res);
                const parsedBody = await assertBodyConfirmToModel(GetCurrencyAPIClass.ResponseDTO, target.rawBody);
                assertStrictEqual(parsedBody.rangeItems[0].rateToBase, config.expectedTernaryCurrencyAmount.toString());
            });
        });

        await this.describe(`With Rates Datum`, async function()
        {
            await resetDatabase();
            const testUsersCreds = await HookShortcuts.registerRandMockUsers(serverURL, 1);
            const { username:firstUserName, token:firstUserToken } = Object.values(testUsersCreds)[0];

            const offsetDate = (d: number) => testDateTimestamp + d * 100 * 1000; // convert the mock date in test case to real date
    
            const utCurMap = // mapping between ID generated on the server, and the name defined in the test case.
            {
                "HKD": undefined as undefined | string,
                "USD": undefined as undefined | string,
                "BTC": undefined as undefined | string,
                "JPY": undefined as undefined | string,
            };
    
            const testCase = 
            {
                currencies: 
                [
                    { amount: undefined, id: "HKD", name: "HKD", refCurrencyId: undefined },
                    { amount: "7.8"      , id: "USD", name: "USD", refCurrencyId: "HKD" },
                    { amount: "20000"    , id: "BTC", name: "BTC", refCurrencyId: "USD" },
                    { amount: "0.7"      , id: "JPY", name: "JPY", refCurrencyId: "HKD" },
                ],
                datums: 
                [
                    { date: 0, amount: "50000"  , refAmountCurrencyId: "USD", refCurrencyId: "BTC" },
                    { date: 1, amount: "60000"  , refAmountCurrencyId: "USD", refCurrencyId: "BTC" },
                    { date: 2, amount: "390000" , refAmountCurrencyId: "HKD", refCurrencyId: "BTC" },
                    { date: 3, amount: "600000" , refAmountCurrencyId: "JPY", refCurrencyId: "BTC" },
        
                    { date: 0, amount: "7.8"    , refAmountCurrencyId: "HKD", refCurrencyId: "USD" },
                    { date: 1, amount: "7.7"    , refAmountCurrencyId: "HKD", refCurrencyId: "USD" },
                    { date: 2, amount: "147.22" , refAmountCurrencyId: "JPY", refCurrencyId: "USD" },
                    { date: 3, amount: "7.7"    , refAmountCurrencyId: "HKD", refCurrencyId: "USD" },
        
                    { date: 0, amount: "0.06"   , refAmountCurrencyId: "HKD", refCurrencyId: "JPY" },
                    { date: 1, amount: "0.05"   , refAmountCurrencyId: "HKD", refCurrencyId: "JPY" },
                    { date: 2, amount: "0.04"   , refAmountCurrencyId: "HKD", refCurrencyId: "JPY" },
                    { date: 3, amount: "0.1"    , refAmountCurrencyId: "HKD", refCurrencyId: "JPY" },
                ],
                expected: 
                {
                    "BTC": 
                    [
                        {v: -0.5 , e:"390000"  },
                        {v: 0    , e:"390000"  },
                        {v: 0.5  , e:"426000"  },
                        {v: 1    , e:"462000"  },
                        {v: 1.5  , e:"426000"  },
                        {v: 2    , e:"390000"  },
                        {v: 2.5  , e:"225000"  },
                        {v: 3    , e:"60000"   },
                        {v: 3.5  , e:"60000"   },
                    ],
                    "USD": 
                    [
                        {v: -0.5 , e:"7.8"                       },
                        {v: 0    , e:"7.8"                       },
                        {v: 0.5  , e:"7.75"                      },
                        {v: 1    , e:"7.7"                       },
                        {v: 1.5  , e:"6.7944"                    },
                        {v: 2    , e:"5.8888"                    },
                        {v: 2.5  , e:"6.7944"                    },
                        {v: 3    , e:"7.7"                       },
                        {v: 3.5  , e:"7.7"                       },
                    ],
                    "JPY": 
                    [
                        {v: -0.5 , e: "0.06"   },
                        {v: 0    , e: "0.06"   },
                        {v: 0.5  , e: "0.055"  },
                        {v: 1    , e: "0.05"   },
                        {v: 1.5  , e: "0.045"  },
                        {v: 2    , e: "0.04"   },
                        {v: 2.5  , e: "0.07"   },
                        {v: 3    , e: "0.1"    },
                        {v: 3.5  , e: "0.1"    },
                    ]
                }
            };
    
            await this.test(`Registering Currencies for test`, async function()
            {
                // Register currencies
                for (let curr of testCase.currencies)
                {
                    const currencyResponse = await postCurrency(firstUserToken, curr.name, curr.name, utCurMap[curr.refCurrencyId], curr.amount);
                    const parsedBody = await assertBodyConfirmToModel(PostCurrencyAPIClass.ResponseDTO, currencyResponse.rawBody);
                    utCurMap[curr.name] = parsedBody.id;
                }
            });

            await this.test(`Posting Currency Rate Datums`, async function()
            {
                for (const datum of testCase.datums)
                {
                    const response = await postCurrencyRateDatum
                    (
                        firstUserToken, 
                        datum.amount,
                        utCurMap[datum.refCurrencyId], 
                        utCurMap[datum.refAmountCurrencyId], 
                        offsetDate(datum.date)
                    );
                    assertStrictEqual(response.res.status, 200);
                    await assertBodyConfirmToModel(PostCurrencyRateDatumAPIClass.ResponseDTO, response.rawBody);
                }
            });

            await this.test(`Test for correct currency rate at given dates`, async function()
            {
                for (const [targetCurrencyId, testValues] of Object.entries(testCase.expected))
                {
                    for (const {v: input, e: expectedRate} of testValues)
                    {
                        const response = await getCurrencyById
                        (
                            firstUserToken, 
                            utCurMap[targetCurrencyId],
                            offsetDate(input)
                        );
                        
                        assertStrictEqual(response.res.status, 200);
                        const currencyResponse = await assertBodyConfirmToModel(GetCurrencyAPIClass.ResponseDTO, response.rawBody);
                        assertStrictEqual(currencyResponse.rangeItems[0].rateToBase, expectedRate); 
                    }
                }

            }, { timeout: 60000 });
        });
    })
}