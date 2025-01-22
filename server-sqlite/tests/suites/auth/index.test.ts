import { BodyGenerator } from "../../lib/bodyGenerator.ts";
import { serverURL, TESTS_ENDPOINTS } from "../../index.test.ts";
import { HTTPAssert } from '../../lib/assert.ts';
import { Context } from "../../lib/context.ts";
import { PostUserAPIClass } from "./classes.ts";

export default async function(this: Context)
{
    await this.module("Auth", async function()
    {
        await this.module(TESTS_ENDPOINTS['users']['post'], async function()
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
                            `${TESTS_ENDPOINTS['users']['post']}`,
                            {
                                method: "POST",
                                body: obj,
                                baseURL: serverURL,
                                expectedStatus: 400
                            }
                        );
                    });
                }

                let _firstUserID = undefined as undefined | string;

                await this.test(`Allow creating users with valid body`, async function()
                {
                    const response = await HTTPAssert.assertFetch
                    (
                        `${TESTS_ENDPOINTS['users']['post']}`,
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