import { IsString } from "class-validator";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { serverURL, UnitTestEndpoints } from "./index.test.js";
import { HTTPAssert } from './lib/assert.js';
import { Context } from "./lib/context.js";
import { ResponsePostUserDTO } from "../../api-types/user.js";

export class ResponsePostUserDTOBody implements ResponsePostUserDTO
{ 
    @IsString() userid: string; 
}

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
            const response = await HTTPAssert.assertFetch
            (
                `${UnitTestEndpoints.userEndpoints.post}`, 
                {
                    method: "POST",
                    body: { username: correctUsername, password: correctPassword },
                    baseURL: serverURL,
                    expectedStatus: 200,
                    expectedBodyType: ResponsePostUserDTOBody
                }
            );
            firstUserID = response.parsedBody.userid;
        });
    });
}