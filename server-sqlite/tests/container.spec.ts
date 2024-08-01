import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { HTTPMethod, HTTPTestsBuilder, TestUserEntry, UnitTestEndpoints } from './.index.spec.js';
import { randomUUID } from 'crypto';
import { BodyGenerator } from './lib/bodyGenerator.js';
import { HookShortcuts } from './lib/hookShortcuts.js';
const chai = use(chaiHttp);

const createPostContainerBody = (name: string) => ({name: name});

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Containers", function()
    {
        describe("GET/POST Containers", function()
        {
            for (const method of (["GET", "POST"] as HTTPMethod[]))
                {
                    it(`${method} Container without tokens`, async function () 
                    {
                        await HTTPTestsBuilder.runRestExecution(
                        {
                            expectedStatusCode: 401,
                            body: {},
                            method: method,
                            endpoint: UnitTestEndpoints.containersEndpoints[method.toLowerCase()],
                            serverURL: serverURL,
                        }, chai);
                    });
        
                    it(`${method} Container with wrong tokens`, async function () 
                    {
                        await HTTPTestsBuilder.runRestExecution(
                        {
                            expectedStatusCode: 401,
                            body: {},
                            method: method,
                            endpoint: UnitTestEndpoints.containersEndpoints[method.toLowerCase()],
                            serverURL: serverURL,
                            headers: { "authorization": randomUUID() },
                        }, chai);
                    });
                }
        });

        describe("Posting Containers (Primary-SubPrimary Relationship)", function()
        {
            const relationshipMatrix = BodyGenerator.enumeratePrimarySubPrimaryMatrixUUID(4,4);

            const testUsersCreds: TestUserEntry[] = relationshipMatrix.userIDs.map(user => (
            {
                password: `${user}password`,
                username: user,
            }));

            // Register users for each user in matrix
            HookShortcuts.registerMockUsersArray(chai, serverURL, testUsersCreds, resetDatabase);

            it(`OwnerID and Name relationship`, async function()
            {
                for (const testCase of relationshipMatrix.matrix)
                {
                    await HTTPTestsBuilder.runRestExecution(
                    {
                        expectedStatusCode: testCase.expectedPass ? 200 : 400,
                        endpoint: UnitTestEndpoints.transactionTypesEndpoints['post'],
                        headers: { 'authorization': testUsersCreds.find(x => x.username === testCase.primaryValue)!.token },
                        serverURL: serverURL,
                        body: createPostContainerBody(testCase.subPrimaryValue),
                        method: "POST"
                    }, chai);   
                }
            });
        })
    });
}