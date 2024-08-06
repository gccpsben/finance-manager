import { randomUUID } from "crypto";
import { HTTPMethod, resetDatabase, serverURL, TestUserEntry, UnitTestEndpoints } from "./index.test.js";
import { HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { HookShortcuts } from "./shortcuts/hookShortcuts.js";
import { ResponsePostContainerDTO } from "../../api-types/container.js";
import { IsString } from "class-validator";

export class ResponsePostContainerDTOBody implements ResponsePostContainerDTO
{
    @IsString() id: string;
}

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
                    await HookShortcuts.postCreateContainer(
                    {
                        serverURL: serverURL,
                        body: { name: testCase.subPrimaryValue },
                        token: userToken,
                        assertBody: testCase.expectedPass,
                        expectedCode: testCase.expectedPass ? 200 : 400
                    });
                }
            });
        });
    });
}