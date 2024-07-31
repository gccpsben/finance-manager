import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { HTTPMethod, HTTPTestsBuilder, UnitTestEndpoints, validateBodyAgainstModel } from './.index.spec.js';
import { randomUUID } from 'crypto';
const chai = use(chaiHttp);

const createTransactionTypeBody = (name: string) => ({ "name": name });

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Transaction Types", function()
    {
        const testUsersCreds: 
        {
            [key: string]: { username: string, password: string, token?: string | undefined, baseCurrencyId?: string | undefined }
        } = 
        {
            "user1" : { username: "user1", password: "user1password" },
            "user2" : { username: "user2", password: "user2password" },
            "user3" : { username: "user3", password: "user3password" }
        };

        before(async () =>
        { 
            await resetDatabase(); 
    
            for (let user of Object.entries(testUsersCreds))
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 200,
                    endpoint: UnitTestEndpoints.userEndpoints['post'],
                    serverURL: serverURL,
                    body: { username: user[1].username, password: user[1].password },
                    method: "POST"
                }, chai);
    
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 200,
                    endpoint: UnitTestEndpoints.loginEndpoints['post'],
                    serverURL: serverURL,
                    body: { username: user[1].username, password: user[1].password },
                    method: "POST",
                    responseValidator: async function (res)
                    {
                        // @ts-ignore
                        class expectedBodyType { @IsString() token: string; }
                        const validationResult = await validateBodyAgainstModel(expectedBodyType, res.body);
                        if (validationResult.errors[0]) throw validationResult.errors[0];
                        testUsersCreds[user[0]].token = validationResult.transformedObject.token;
                    }
                }, chai);
            }
        });

        for (const user of Object.entries(testUsersCreds))
        {
            it(`POST Types without name - ${user[0]}`, async function()
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 400,
                    endpoint: UnitTestEndpoints.transactionTypesEndpoints['post'],
                    serverURL: serverURL,
                    headers: { 'authorization': user[1].token },
                    body: { name: '' },
                    method: "POST"
                }, chai);
            });

            it(`POST Types without tokens - ${user[0]}`, async function()
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 401,
                    endpoint: UnitTestEndpoints.transactionTypesEndpoints['post'],
                    serverURL: serverURL,
                    body: createTransactionTypeBody(`Type-${user[0]}`),
                    method: "POST"
                }, chai);
            });

            it(`POST Types with valid body - ${user[0]}`, async function()
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 200,
                    endpoint: UnitTestEndpoints.transactionTypesEndpoints['post'],
                    headers: { 'authorization': user[1].token },
                    serverURL: serverURL,
                    body: createTransactionTypeBody(`Type-${user[0]}`),
                    method: "POST"
                }, chai);
            });

            it(`POST Types with repeated name - ${user[0]}`, async function()
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 400,
                    endpoint: UnitTestEndpoints.transactionTypesEndpoints['post'],
                    headers: { 'authorization': user[1].token },
                    serverURL: serverURL,
                    body: createTransactionTypeBody(`Type-${user[0]}`),
                    method: "POST"
                }, chai);
            });
        }
    });
}