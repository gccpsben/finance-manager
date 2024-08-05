import { IsString, IsBoolean, IsOptional, IsObject, IsDefined } from "class-validator";
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
import { PostCurrencyDTO, ResponseGetCurrencyDTO, ResponsePostCurrencyDTO } from "../../api-types/currencies.js";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never
export class ResponseGetCurrencyDTOClass implements ArrayElement<ResponseGetCurrencyDTO>
{
    @IsString() id: string;
    @IsString() name: string;
    @IsOptional() @IsString() amount: string;
    @IsOptional() @IsString() refCurrency: string;
    @IsString() owner: string;
    @IsBoolean() isBase: boolean;
    @IsString() ticker: string;
    @IsDecimalJSString() rateToBase: string;
}

export class ResponsePostCurrencyDTOClass implements ResponsePostCurrencyDTO
{
    @IsString() id: string;
}

function createBaseCurrencyPostBody(name: string, ticker: string)
{
    return { name: name, ticker: ticker, refCurrencyId: undefined, amount: undefined } satisfies PostCurrencyDTO;
}

function createCurrencyPostBody(name: string, ticker: string, refCurrencyId: string, amount: string)
{
    return { name: name, ticker: ticker, refCurrencyId: refCurrencyId, amount: amount } satisfies PostCurrencyDTO;
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

/** This does not perform assertion */
async function getCurrencyById(token:string, id: string)
{
    const response = await HTTPAssert.assertFetch
    (
        `${UnitTestEndpoints.currenciesEndpoints['get']}?id=${id}`, 
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
            const response = await postBaseCurrency(user.token, `User-Currency`, `USER-TICKER`);
            HTTPAssert.assertStatus(200, response.res);
            await assertBodyConfirmToModel(ResponsePostCurrencyDTOClass, response.rawBody);
        });

        await this.test(`Forbid repeated base currencies`, async function()
        {
            await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
            {
                baseURL: serverURL, expectedStatus: 400, method: "POST",
                body: createBaseCurrencyPostBody(`User-Currency`, `USER-TICKER`),
                headers: { "authorization": user.token }
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
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
                {
                    baseURL: serverURL, expectedStatus: 200, method: "POST",
                    body: createBaseCurrencyPostBody(`User-Currency`, `USER-TICKER`),
                    headers: { "authorization": user.token },
                    expectedBodyType: ResponsePostCurrencyDTOClass
                });
                user.baseCurrencyId = response.parsedBody.id;
            }

            for (const testCase of relationshipMatrix.matrix)
            {
                const userObj = testUsersCreds.find(x => x.username === testCase.primaryValue)!;
                const userToken = userObj.token;

                await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
                {
                    baseURL: serverURL,
                    expectedStatus: testCase.expectedPass ? 200 : 400,
                    method: "POST",
                    body: createCurrencyPostBody(testCase.subPrimaryValue, testCase.subPrimaryValue, userObj.baseCurrencyId, "1"),
                    headers: { "authorization": userToken }
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
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
                {
                    baseURL: serverURL, expectedStatus: 200, method: "POST",
                    body: createBaseCurrencyPostBody(`User-Currency`, `USER-TICKER`),
                    headers: { "authorization": firstUser.token },
                    expectedBodyType: ResponsePostCurrencyDTOClass
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
            const basePostReq: AssertFetchConfig<Object> = 
            {
                baseURL: serverURL,
                method: "POST"
            };
            // Generate missing field requests 
            for (const testCase of BodyGenerator.enumerateMissingField(getBaseObj()))
            {
                const missedField = testCase.fieldMissed;
                const obj = testCase.obj;   

                await this.test(`Forbid creating regular currencies without ${missedField} but all other fields`, async function () 
                {
                    await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
                    {
                        ...basePostReq, expectedStatus: 400,
                        body: { ...obj },
                        headers: { "authorization": firstUser.token }
                    });
                });
            }
        }).bind(this)();

        await this.test(`Forbid creating currencies with non-number amount`, async function () 
        {
            const testStrs = ["100a", "", "2e+3", "0x123", "***", ".../"];
            for (const str of testStrs)
            {
                await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
                {
                    baseURL: serverURL, method: "POST", expectedStatus: 400,
                    body: createCurrencyPostBody(`User-Currency`, `USER-TICKER`, firstUser.baseCurrencyId, str),
                    headers: { "authorization": firstUser.token }
                });
            }
        });

        const addedCurrenciesIDs: string[] = [];
        await this.test(`Allow creating currencies with floating point amount`, async function () 
        {
            const testStrs = fillArray(50, () => `${simpleFaker.number.float()}`);
            for (const str of testStrs)
            {
                const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
                {
                    baseURL: serverURL, method: "POST", expectedStatus: 200,
                    body: createCurrencyPostBody(randomUUID(), randomUUID(), firstUser.baseCurrencyId, str),
                    headers: { "authorization": firstUser.token },
                    expectedBodyType: ResponsePostCurrencyDTOClass
                });
                addedCurrenciesIDs.push(response.parsedBody.id);
            }
        });

        await this.test(`Check for missing props on the posted currencies`, async function () 
        {
            for (const cID of addedCurrenciesIDs)
            {
                const response = await HTTPAssert.assertFetch
                (
                    `${UnitTestEndpoints.currenciesEndpoints['get']}?id=${cID}`, 
                    {
                        baseURL: serverURL, method: "GET", expectedStatus: 200,
                        headers: { "authorization": firstUser.token }
                    }
                );
                await assertArrayAgainstModel(ResponseGetCurrencyDTOClass, response.rawBody);
            }
        });
    });
}

async function ratesCorrectnessCheck(this:Context)
{
    await this.describe(`Rates Correctness`, async function()
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
            const parsedBody = await assertArrayAgainstModel(ResponseGetCurrencyDTOClass, response.rawBody);
            assertStrictEqual(parsedBody[0].rateToBase, "1");
        });

        await this.describe(`Regular Rates Test`, async function()
        {
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
                await assertBodyConfirmToModel(ResponsePostCurrencyDTOClass, secondaryRes.rawBody);
                config.secondaryCurrencyID = secondaryRes.rawBody["id"];

                const ternaryRes = await postCurrency(firstUserToken, randomUUID(), randomUUID(), config.secondaryCurrencyID, config.ternaryCurrencyAmount.toString());
                HTTPAssert.assertStatus(200, ternaryRes.res);
                await assertBodyConfirmToModel(ResponsePostCurrencyDTOClass, ternaryRes.rawBody);
                config.ternaryCurrencyID = ternaryRes.rawBody["id"];
            }).bind(this)();

            await this.test(`Check if secondary currency rate is ${config.expectedSecondaryCurrencyAmount.toString()}`, async function()
            {
                const target = await getCurrencyById(firstUserToken, config.secondaryCurrencyID);
                HTTPAssert.assertStatus(200, target.res);
                const parsedBody = await assertArrayAgainstModel(ResponseGetCurrencyDTOClass, target.rawBody);
                assertStrictEqual(parsedBody[0].rateToBase, config.expectedSecondaryCurrencyAmount.toString());
            });

            await this.test(`Check if ternary currency rate is ${config.expectedTernaryCurrencyAmount.toString()}`, async function()
            {
                const target = await getCurrencyById(firstUserToken, config.ternaryCurrencyID);
                HTTPAssert.assertStatus(200, target.res);
                const parsedBody = await assertArrayAgainstModel(ResponseGetCurrencyDTOClass, target.rawBody);
                assertStrictEqual(parsedBody[0].rateToBase, config.expectedTernaryCurrencyAmount.toString());
            });
        });
    });
}