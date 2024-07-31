import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsObject, IsString } from 'class-validator';
import { ensureBodyConfirmToModel, HTTPTestsBuilder, UnitTestEndpoints } from './.index.spec.js';
import { BodyGenerator } from './lib/bodyGenerator.js';
const chai = use(chaiHttp);

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Access Tokens and Users" , () => 
    {
        const correctUsername = "User 1";
        const correctPassword = "password123";

        for (const { obj, fieldMissed } of BodyGenerator.enumerateMissingField( { username: correctUsername, password: correctPassword } ))
        {
            it(`Create User without ${fieldMissed}`, async function()
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 400, body: obj, method: "POST",
                    endpoint: UnitTestEndpoints.userEndpoints.post,
                    serverURL: serverURL
                }, chai);
            });
        }

        it("POST User with valid body", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 200,
                endpoint: UnitTestEndpoints.userEndpoints.post,
                serverURL: serverURL,
                body: { username: correctUsername, password: correctPassword },
                method: "POST",
                responseValidator: async function(res)
                {
                    // @ts-ignore
                    class expectedBodyType { @IsString() userid: string; }
                    await ensureBodyConfirmToModel(expectedBodyType, res.body);
                }
            }, chai);
        });

        it("Login without password", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 400,
                endpoint: UnitTestEndpoints.loginEndpoints.post,
                serverURL: serverURL,
                body: { username: correctUsername },
                method: "POST"
            }, chai);
        });

        it("Login without username", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 400,
                endpoint: UnitTestEndpoints.loginEndpoints.post,
                serverURL: serverURL,
                body: { password: correctPassword },
                method: "POST"
            }, chai);
        });

        it("Login with incorrect username", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 401,
                endpoint: UnitTestEndpoints.loginEndpoints.post,
                serverURL: serverURL,
                body: { username: correctUsername + "123", password: correctPassword },
                method: "POST"
            }, chai);
        });

        it("Login with incorrect password", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 401,
                endpoint: UnitTestEndpoints.loginEndpoints.post,
                serverURL: serverURL,
                body: { username: correctUsername, password: correctPassword + '1231s' },
                method: "POST"
            }, chai);
        });
        
        let loginToken = undefined as undefined | string;

        it("Login with correct username and password", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 200,
                endpoint: UnitTestEndpoints.loginEndpoints.post,
                serverURL: serverURL,
                body: { username: correctUsername, password: correctPassword },
                method: "POST",
                responseValidator: async function(res)
                {
                    class expectedBodyType
                    {
                        // @ts-ignore
                        @IsString() token: string;
        
                        // @ts-ignore
                        @IsObject() owner: object;
        
                        // @ts-ignore
                        @IsDateString() creationDate: string;
        
                        // @ts-ignore
                        @IsDateString() expiryDate: string;
                    }

                    const validationResult = await ensureBodyConfirmToModel(expectedBodyType, res.body);
                    loginToken = validationResult.token;
                }
            }, chai);
        });
    });    
}