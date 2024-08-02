import { IsNumber, IsString } from "class-validator";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { serverPort, serverURL, UnitTestEndpoints } from "./index.test.js";
import { assert, assertBodyConfirmToModel, HTTPAssert, validateBodyAgainstModel } from './lib/assert.js';
import { Context } from "./lib/context.js";

export default async function(this: Context)
{
    await this.describe("Access Tokens and Users", async function()
    {
        const correctUsername = "User 1";
        const correctPassword = "password123";

        for (const { obj, fieldMissed } of BodyGenerator.enumerateMissingField( { username: correctUsername, password: correctPassword } ))
        {
            await this.test(`Forbid creating users without ${fieldMissed}`, async function()
            {
                await HTTPAssert.assertFetch
                (
                    `${UnitTestEndpoints.userEndpoints.post}`, 
                    {
                        method: "POST",
                        body: obj,
                        baseURL: serverURL,
                        expectedStatus: 400
                    }
                );
            });
        }

        let firstUserID = undefined as undefined | string;

        await this.test(`Allow creating users with valid body`, async function()
        {            
            class expectedBodyType { @IsString() userid: string; }
            const response = await HTTPAssert.assertFetch
            (
                `${UnitTestEndpoints.userEndpoints.post}`, 
                {
                    method: "POST",
                    body: { username: correctUsername, password: correctPassword },
                    baseURL: serverURL,
                    expectedStatus: 200,
                    expectedBodyType: expectedBodyType
                }
            );
            firstUserID = response.parsedBody.userid;
        });
    });
}