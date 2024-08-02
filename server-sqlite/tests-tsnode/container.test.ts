import { randomUUID } from "crypto";
import { HTTPMethod, resetDatabase, serverPort, serverURL, TestUserEntry, UnitTestEndpoints } from "./index.test.js";
import { HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { HookShortcuts } from "./lib/hookShortcuts.js";

const createPostContainerBody = (name: string) => ({name: name});

export default async function(this: Context)
{
    await this.describe("Containers", async function()
    {
        await this.describe("Get/Create Containers", async function()
        {
            for (const method of (["GET", "POST"] as HTTPMethod[]))
            {
                await resetDatabase();

                await this.test(`Forbid ${method} containers without / wrong tokens`, async function()
                {
                    await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints[method.toLowerCase()], 
                    {
                        baseURL: serverURL,
                        expectedStatus: 401,
                        method: method   
                    });

                    await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints[method.toLowerCase()], 
                    {
                        baseURL: serverURL,
                        expectedStatus: 401,
                        method: method,
                        init: { headers: { "authorization": randomUUID() } }
                    });
                });
            }

            await this.test(`Test for OwnerID and Name pri-subpri relationship (5x5)`, async function()
            {
                await resetDatabase();
    
                const relationshipMatrix = BodyGenerator.enumeratePrimarySubPrimaryMatrixUUID(5,5);
    
                const testUsersCreds: TestUserEntry[] = relationshipMatrix.userIDs.map(user => (
                {
                    password: `${user}password`,
                    username: user,
                }));
    
                // Register users for each user in matrix
                await HookShortcuts.registerMockUsersArray(serverURL, testUsersCreds);
    
                for (const testCase of relationshipMatrix.matrix)
                {
                    const userToken = testUsersCreds.find(x => x.username === testCase.primaryValue)!.token;
                    const r = await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints['post'], 
                    {
                        baseURL: serverURL,
                        expectedStatus: testCase.expectedPass ? 200 : 400,
                        method: "POST",
                        body: createPostContainerBody(testCase.subPrimaryValue),
                        headers: { "authorization": userToken }
                    });
                }
            });
        });
    });
}