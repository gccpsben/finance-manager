import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { ensureBodyConfirmToModel, HTTPMethod, HTTPTestsBuilder, TestUserDict, TestUserEntry, UnitTestEndpoints } from './.index.spec.js';
import { randomUUID } from 'crypto';
import { BodyGenerator } from './lib/bodyGenerator.js';
import { HookShortcuts } from './lib/hookShortcuts.js';
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
        describe("Posting Types", function()
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
            }
        });

        describe("Posting Types (Primary-SubPrimary Relationship)", function()
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
                        body: createTransactionTypeBody(testCase.subPrimaryValue),
                        method: "POST"
                    }, chai);
                }
            });
        });
    })
}