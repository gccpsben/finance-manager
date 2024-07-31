import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { ensureBodyConfirmToModel, HTTPMethod, HTTPTestsBuilder, HTTPTestsBuilderUtils, TestUserDict, UnitTestEndpoints } from './.index.spec.js';
import { randomUUID } from 'crypto';
import { BodyGenerator } from './lib/bodyGenerator.js';
import { HookShortcuts } from './lib/hookShortcuts.js';
const chai = use(chaiHttp);

function createBaseCurrencyPostBody(name: string, ticker: string)
{
    return { name: name, ticker: ticker };
}

function createCurrencyPostBody(name: string, ticker: string, refCurrencyId: string, amount: string)
{
    return { name: name, ticker: ticker, refCurrencyId: refCurrencyId, amount: amount };
}

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;
    const serverURL = `http://localhost:${serverPort}`;

    describe("Currencies", function()
    {
        describe("Base Currencies" , function ()
        {
            const testUsersCreds: TestUserDict = 
            {
                "user1" : { username: "user1", password: "user1password" },
                "user2" : { username: "user2", password: "user2password" },
                "user3" : { username: "user3", password: "user3password" }
            };
    
            HookShortcuts.registerMockUsers(chai, serverURL, testUsersCreds, resetDatabase);
    
            for (const user of Object.entries(testUsersCreds))
            {
                it(`POST Currencies without name - ${user[0]}`, async function()
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        expectedStatusCode: 400,
                        endpoint: UnitTestEndpoints.currenciesEndpoints['post'],
                        serverURL: serverURL,
                        headers: { 'authorization': user[1].token },
                        body: { ticker: "USER-TICKER" },
                        method: "POST"
                    }, chai);
                });
    
                it(`POST Currencies without ticker - ${user[0]}`, async function()
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        expectedStatusCode: 400,
                        endpoint: UnitTestEndpoints.currenciesEndpoints['post'],
                        serverURL: serverURL,
                        headers: { 'authorization': user[1].token },
                        body: { name: "Currency1" },
                        method: "POST"
                    }, chai);
                });
    
                it(`POST Currencies without tokens - ${user[0]}`, async function()
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        expectedStatusCode: 401,
                        endpoint: UnitTestEndpoints.currenciesEndpoints['post'],
                        serverURL: serverURL,
                        body: createBaseCurrencyPostBody(`User-Currency`, `USER-TICKER`),
                        method: "POST"
                    }, chai);
                });
    
                it(`POST Base currencies with valid token and body - ${user[0]}`, async function()
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        expectedStatusCode: 200,
                        endpoint: UnitTestEndpoints.currenciesEndpoints['post'],
                        serverURL: serverURL,
                        headers: { 'authorization': user[1].token },
                        body: createBaseCurrencyPostBody(`${user[0]}-Currency`, `${user[0]}-TICKER`),
                        method: "POST"
                    }, chai);
                });
            }
    
            for (const user of Object.entries(testUsersCreds))
            {
                it(`POST Repeated Base currency - ${user[0]}`, async function()
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        expectedStatusCode: 400,
                        endpoint: UnitTestEndpoints.currenciesEndpoints['post'],
                        serverURL: serverURL,
                        headers: { 'authorization': user[1].token },
                        body: createBaseCurrencyPostBody(`${user[0]}-Currency`, `${user[0]}-TICKER`),
                        method: "POST"
                    }, chai);
                });
            }
        });    
    
        describe("Regular Currencies" , function ()
        {
            const testUsersCreds: TestUserDict = 
            {
                "user1" : { username: "user1", password: "user1password", baseCurrencyId: undefined },
                "user2" : { username: "user2", password: "user2password", baseCurrencyId: undefined },
                "user3" : { username: "user3", password: "user3password", baseCurrencyId: undefined }
            };

            HookShortcuts.registerMockUsers(chai, serverURL, testUsersCreds, resetDatabase);
    
            before(async function ()
            {   
                for (let user of Object.entries(testUsersCreds))
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        expectedStatusCode: 200,
                        endpoint: UnitTestEndpoints.currenciesEndpoints['post'],
                        serverURL: serverURL,
                        body: createBaseCurrencyPostBody("Base Currency", "BC"),
                        method: "POST",
                        headers: { 'authorization': testUsersCreds[user[0]].token },
                        responseValidator: async function (res)
                        {
                            // @ts-ignore
                            class expectedBodyType { @IsString() id: string; }
                            const transformedObject = await ensureBodyConfirmToModel(expectedBodyType, res.body);
                            testUsersCreds[user[0]].baseCurrencyId = transformedObject.id;
                        }
                    }, chai);
                }
            });
    
            for (const [userKeyName, userObj] of Object.entries(testUsersCreds))
            {
                const getBaseObj = () => createCurrencyPostBody(`${userKeyName}Currency`, `${userKeyName}_TICKER`, userObj.baseCurrencyId!, "100");
                const getBaseObjSameNameWithOtherUsers = () => createCurrencyPostBody(`RegCurrency`, `REG_TICKER`, userObj.baseCurrencyId!, "100");

                const basePostReq = 
                {
                    endpoint: UnitTestEndpoints.currenciesEndpoints['post'],
                    serverURL: serverURL
                };

                // Generate missing field requests 
                for (const testCase of BodyGenerator.enumerateMissingField(getBaseObj()))
                {
                    const missedField = testCase.fieldMissed;
                    const obj = testCase.obj;   

                    it(`POST Regular Currency without ${missedField} - ${userKeyName}`, async function () 
                    {
                        await HTTPTestsBuilder.runRestExecution(
                        {
                            ...basePostReq,
                            expectedStatusCode: 400,
                            headers: { 'authorization': userObj.token },
                            body: { ...obj },
                            method: "POST"
                        }, chai);
                    });
                }

                it(`POST Regular Currency with non-number amount - ${userKeyName}`, async function () 
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        ...basePostReq,
                        expectedStatusCode: 400,
                        headers: { 'authorization': userObj.token },
                        body: { ...getBaseObj(), amount: "100a" },
                        method: "POST"
                    }, chai);
                });

                
                it(`POST Regular Currency with floating point amount - ${userKeyName}`, async function () 
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        ...basePostReq,
                        expectedStatusCode: 200,
                        headers: { 'authorization': userObj.token },
                        body: { ...getBaseObj(), name: "New Currency", ticker: "NEW_TICKER", amount: "100.00001" },
                        method: "POST"
                    }, chai);
                });
    
                it(`POST Regular Currency with valid args - ${userKeyName}`, async function () 
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        ...basePostReq,
                        expectedStatusCode: 200,
                        headers: { 'authorization': userObj.token },
                        body: { ...getBaseObj() },
                        method: "POST"
                    }, chai);
                });

                it(`POST Regular Currency with same name with other users - ${userKeyName}`, async function () 
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        ...basePostReq,
                        expectedStatusCode: 200,
                        headers: { 'authorization': userObj.token },
                        body: { ...getBaseObjSameNameWithOtherUsers() },
                        method: "POST"
                    }, chai);
                });

                it(`POST Regular Currency (Repeated Ticker) - ${userKeyName}`, async function () 
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        ...basePostReq,
                        expectedStatusCode: 400,
                        headers: { 'authorization': userObj.token },
                        body: { ...getBaseObjSameNameWithOtherUsers(), name: `NEW_NAME` },
                        method: "POST"
                    }, chai);
                });

                it(`POST Regular Currency (Repeated Name) - ${userKeyName}`, async function () 
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        ...basePostReq,
                        expectedStatusCode: 400,
                        headers: { 'authorization': userObj.token },
                        body: { ...getBaseObjSameNameWithOtherUsers(), ticker: `NEW_TICKER` },
                        method: "POST"
                    }, chai);
                });
            }
        });
    });
}