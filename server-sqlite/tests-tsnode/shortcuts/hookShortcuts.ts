
import { IsString } from 'class-validator';
import { TestUserDict, UnitTestEndpoints, TestUserEntry } from '../index.test.js';
import { HTTPAssert } from '../lib/assert.js';
import { Context } from '../lib/context.js';
import { randomUUID } from 'crypto';
import { ResponsePostLoginDTOBody } from '../auth.test.js';

export class HookShortcuts
{
    public static async registerRandMockUsers(serverURL:string, userCount = 5)
    {
        let randUsers: TestUserDict = {};
        for (let i = 0; i < userCount; i++)
        {
            const username = randomUUID();
            randUsers[username] = { password: randomUUID(), username: username };
        }
        return await HookShortcuts.registerMockUsers(serverURL, randUsers);
    }

    /** Register all users defined in `usersCreds`. Token will be set on each object after registering. */
    public static async registerMockUsers(serverURL: string, usersCreds: TestUserDict)
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
                    expectedBodyType: ResponsePostLoginDTOBody
                }
            );
            usersCreds[key].token = loginResponse.parsedBody.token;
        }

        return usersCreds;
    }

    public static async registerMockUsersArray(serverURL: string, usersCreds: TestUserEntry[])
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
                    expectedBodyType: ResponsePostLoginDTOBody
                }
            );
            user.token = loginResponse.parsedBody.token;
        }
    }
}