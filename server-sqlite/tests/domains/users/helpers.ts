// deno-lint-ignore-file no-namespace
import { randomUUID } from "node:crypto";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { POST_USER_API_PATH } from "./paths.ts";
import path from "node:path";
import { createLoginToUserFunc } from "../auth/helpers.ts";
import { PostUserAPIClass } from "./classes.ts";
import { getTestServerPath } from "../../init.ts";

export type TestUserDict = { [key: string]: TestUserEntry };
export type TestUserEntry =
{
    username: string,
    password: string,
    token?: string | undefined,
    baseCurrencyId?: string | undefined
};

export namespace AuthHelpers
{
    export async function registerRandMockUsers
    (
        { userCount, port }:
        { userCount: number, port: number }
    )
    {
        const randUsers: TestUserDict = {};
        for (let i = 0; i < userCount; i++)
        {
            const username = randomUUID();
            randUsers[username] = { password: randomUUID(), username: username };
        }
        return await AuthHelpers.registerMockUsers({
            port: port,
            usersCreds: randUsers
        });
    }

    /** Register all users defined in `usersCreds`. Token will be set on each object after registering. */
    export async function registerMockUsers
    (
        { port, usersCreds } :
        { port: number, usersCreds: TestUserDict }
    )
    {
        for (const [key, value] of Object.entries(usersCreds))
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: 'default',
                body: ['EXPECTED', { username: value.username, password: value.password }]
            });

            const loginResponse = await createLoginToUserFunc()
            ({
                token: undefined,
                body: ['EXPECTED', { username: value.username, password: value.password }],
                asserts: 'default'
            });
            usersCreds[key].token = loginResponse.parsedBody!.token;
        }

        return usersCreds;
    }

    export async function registerMockUsersArray
    (
        { port, usersCreds } :
        { port: number, usersCreds: TestUserEntry[] }
    )
    {
        const usernameToTokenMap: { [name: string]: string } = {};
        for (const user of usersCreds)
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: 'default',
                body: ['EXPECTED', { username: user.username, password: user.password }]
            });

            const loginResponse = await createLoginToUserFunc()
            ({
                token: undefined,
                body: ['EXPECTED', { username: user.username, password: user.password }],
                asserts: 'default'
            });
            usernameToTokenMap[user.username] = loginResponse.parsedBody!.token;
        }
        return usernameToTokenMap;
    }
}

export const createPostUserFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<{ username: string, password: string }, PostUserAPIClass.ResponseDTO>
    (
        'POST',
        path.join(getTestServerPath(), POST_USER_API_PATH),
        {
            bodyType: PostUserAPIClass.ResponseDTO,
            status: 200
        }
    )
};