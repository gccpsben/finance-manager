import { IsDateString, IsString } from "class-validator";
import { BodyGenerator } from "../../lib/bodyGenerator.js";
import { serverURL, TestUserDict, TestUserEntry, UnitTestEndpoints } from "../../index.test.js";
import { HTTPAssert } from '../../lib/assert.js';
import { Context } from "../../lib/context.js";
import { PostUserAPI } from "../../../../api-types/user.js";
import { PostLoginAPI } from "../../../../api-types/auth.js";
import { IsUTCDateInt } from "../../../server_source/db/validators.js";
import { randomUUID } from "crypto";

export namespace PostUserAPIClass
{
    export class RequestDTO implements PostUserAPI.RequestDTO
    {
        @IsString() username: string;
        @IsString() password: string;
    }

    export class ResponseDTO implements PostUserAPI.ResponseDTO
    {
        @IsString() userid: string;
    }
}

export namespace PostLoginAPIClass
{
    export class RequestDTO implements PostLoginAPI.RequestDTO
    {
        @IsString() username: string;
        @IsString() password: string;
    }

    export class ResponseDTO implements PostLoginAPI.ResponseDTO
    {
        @IsString() token: string;
        @IsUTCDateInt() creationDate: number;
        @IsUTCDateInt() expiryDate: number;
        @IsString() owner: string;
    }
}

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

export namespace AuthHelpers
{
    export async function registerRandMockUsers(serverURL:string, userCount = 5)
    {
        let randUsers: TestUserDict = {};
        for (let i = 0; i < userCount; i++)
        {
            const username = randomUUID();
            randUsers[username] = { password: randomUUID(), username: username };
        }
        return await AuthHelpers.registerMockUsers(serverURL, randUsers);
    }

    /** Register all users defined in `usersCreds`. Token will be set on each object after registering. */
    export async function registerMockUsers(serverURL: string, usersCreds: TestUserDict)
    {
        for (let [key, value] of Object.entries(usersCreds))
        {
            await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.userEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: value.username, password: value.password },
                    method: "POST"
                }
            );

            const loginResponse = await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.loginEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: value.username, password: value.password },
                    method: "POST",
                    expectedBodyType: PostLoginAPIClass.ResponseDTO
                }
            );
            usersCreds[key].token = loginResponse.parsedBody.token;
        }

        return usersCreds;
    }

    export async function registerMockUsersArray(serverURL: string, usersCreds: TestUserEntry[])
    {
        for (let user of usersCreds)
        {
            await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.userEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: user.username, password: user.password },
                    method: "POST"
                }
            );

            const loginResponse = await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.loginEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: user.username, password: user.password },
                    method: "POST",
                    expectedBodyType: PostLoginAPIClass.ResponseDTO
                }
            );
            user.token = loginResponse.parsedBody.token;
        }
    }
}