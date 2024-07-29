import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { HTTPTestsBuilder, validateBodyAgainstModel } from './.index.spec.js';
const chai = use(chaiHttp);

const POST_USER_ENDPOINT = `/api/v1/users`;
const POST_LOGIN_ENDPOINT = `/api/v1/auth/login`;

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Access Tokens and Users" , () => 
    {
        HTTPTestsBuilder.expectStatus({
            statusCode: 400,
            testName: "Create User without body",
            method: "POST",
            endpoint: POST_USER_ENDPOINT,
            serverURL: serverURL,
            body: { },
        }, it, chai);

        HTTPTestsBuilder.expectStatus({
            statusCode: 400,
            testName: "Create User without username",
            method: "POST",
            endpoint: POST_USER_ENDPOINT,
            serverURL: serverURL,
            body: { password: '123' },
        }, it, chai);

        HTTPTestsBuilder.expectStatus({
            statusCode: 400,
            testName: "Create User without password",
            method: "POST",
            endpoint: POST_USER_ENDPOINT,
            serverURL: serverURL,
            body: { username: 'Username here' },
        }, it, chai);

        const correctUsername = "User 1";
        const correctPassword = "password123";

        HTTPTestsBuilder.expectStatus({
            statusCode: 200,
            testName: "POST User with valid body",
            method: "POST",
            endpoint: POST_USER_ENDPOINT,
            serverURL: serverURL,
            body: { username: correctUsername, password: correctPassword },
            validator: async function (res, done) 
            {
                class expectedBodyType
                {
                    // @ts-ignore
                    @IsString() userid: string;
                }

                const validationResult = await validateBodyAgainstModel(expectedBodyType, res.body);
                done(validationResult.errors[0]);
            }
        }, it, chai);

        HTTPTestsBuilder.expectStatus({
            statusCode: 400,
            testName: "Login without password",
            method: "POST",
            endpoint: POST_LOGIN_ENDPOINT,
            serverURL: serverURL,
            body: { username: correctUsername },
        }, it, chai);

        HTTPTestsBuilder.expectStatus({
            statusCode: 400,
            testName: "Login without username",
            method: "POST",
            endpoint: POST_LOGIN_ENDPOINT,
            serverURL: serverURL,
            body: { password: correctPassword },
        }, it, chai);

        HTTPTestsBuilder.expectStatus({
            statusCode: 401,
            testName: "Login with incorrect username",
            method: "POST",
            endpoint: POST_LOGIN_ENDPOINT,
            serverURL: serverURL,
            body: { username: correctUsername + "123", password: correctPassword },
        }, it, chai);
        
        HTTPTestsBuilder.expectStatus({
            statusCode: 401,
            testName: "Login with incorrect password",
            method: "POST",
            endpoint: POST_LOGIN_ENDPOINT,
            serverURL: serverURL,
            body: { username: correctUsername, password: correctPassword + '1231s' },
        }, it, chai);

        let loginToken = undefined as undefined | string;

        HTTPTestsBuilder.expectStatus(
        {
            statusCode: 200,
            testName: "Login with correct username and password",
            method: "POST",
            endpoint: POST_LOGIN_ENDPOINT,
            serverURL: serverURL,
            body: { username: correctUsername, password: correctPassword },
            validator: async function (res, done) 
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
                loginToken = validationResult.transformedObject.token;
                done(validationResult.errors[0]);
            }
        }, it, chai);
    });    
}