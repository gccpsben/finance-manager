import { TESTS_ENDPOINTS, TestUserDict, TestUserEntry } from "../../index.test.ts";
import { HTTPAssert } from '../../lib/assert.ts';
import { randomUUID } from "node:crypto";
import { PostLoginAPIClass } from "./classes.ts";

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
                TESTS_ENDPOINTS['users']['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: value.username, password: value.password },
                    method: "POST"
                }
            );

            const loginResponse = await HTTPAssert.assertFetch
            (
                TESTS_ENDPOINTS['login']['post'],
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
                TESTS_ENDPOINTS['users']['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: user.username, password: user.password },
                    method: "POST"
                }
            );

            const loginResponse = await HTTPAssert.assertFetch
            (
                TESTS_ENDPOINTS['login']['post'],
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