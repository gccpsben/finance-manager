import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { HTTPTestsBuilder, UnitTestEndpoints, validateBodyAgainstModel } from './.index.spec.js';
const chai = use(chaiHttp);

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Access Tokens and Users" , () => 
    {
        it("Create User without body", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 400,
                endpoint: UnitTestEndpoints.userEndpoints.post,
                serverURL: serverURL,
                body: {},
                method: "POST"
            }, chai);
        });

        it("Create User without username", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 400,
                endpoint: UnitTestEndpoints.userEndpoints.post,
                serverURL: serverURL,
                body: { password: '123' },
                method: "POST"
            }, chai);
        });

        it("Create User without password", async function()
        {
            await HTTPTestsBuilder.runRestExecution(
            {
                expectedStatusCode: 400,
                endpoint: UnitTestEndpoints.userEndpoints.post,
                serverURL: serverURL,
                body: { username: 'Username here' },
                method: "POST"
            }, chai);
        });

        const correctUsername = "User 1";
        const correctPassword = "password123";

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
                    class expectedBodyType
                    {
                        // @ts-ignore
                        @IsNumber() userid: string;
                    }

                    const validationResult = await validateBodyAgainstModel(expectedBodyType, res.body);
                    if (validationResult[0]) throw validationResult[0];
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
                        @IsString() owner: string;
        
                        // @ts-ignore
                        @IsDateString() creationDate: string;
        
                        // @ts-ignore
                        @IsDateString() expiryDate: string;
                    }

                    const validationResult = await validateBodyAgainstModel(expectedBodyType, res.body);
                    if (validationResult[0]) throw validationResult[0];
                    loginToken = validationResult.transformedObject.token;
                }
            }, chai);
        });
    });    
}