import { BodyGenerator } from "../../lib/bodyGenerator.js";
import { serverURL, TestUserDict, TestUserEntry, UnitTestEndpoints } from "../../index.test.js";
import { HTTPAssert } from '../../lib/assert.js';
import { Context } from "../../lib/context.js";
import { PostUserAPIClass } from "./classes.js";

export default async function(this: Context)
{
    await this.module("Auth", async function()
    {
        await this.module(UnitTestEndpoints.loginEndpoints['post'], async function()
        {
            await this.module(`post`, async function()
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
                            expectedBodyType: PostUserAPIClass.ResponseDTO
                        }
                    );
                    firstUserID = response.parsedBody.userid;
                });
            });
        });
    });
}