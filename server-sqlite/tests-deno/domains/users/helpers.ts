// deno-lint-ignore-file no-namespace
import { randomUUID } from "node:crypto";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { assertNotEquals } from "@std/assert/not-equals";
import { POST_USER_API_PATH } from "./paths.ts";
import path from "node:path";
import { loginToUser } from "../auth/helpers.ts";

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
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 200, method: "POST",
                    body: { username: value.username, password: value.password },
                }
            );

            usersCreds[key].token = (await loginToUser({ port, username: value.username, password: value.password })).token;
        }

        return usersCreds;
    }

    export async function registerMockUsersArray
    (
        { port, usersCreds } :
        { port: number, usersCreds: TestUserEntry[] }
    )
    {
        const usernameToTokenMap: { [username: string]: string } = {};
        for (const user of usersCreds)
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 200, method: "POST",
                    body: { username: user.username, password: user.password },
                }
            );

            const token = (await loginToUser({ port, username: user.username, password: user.password })).token;
            assertNotEquals(token, undefined);
            if (token) usernameToTokenMap[user.username] = token;
        }
        return usernameToTokenMap;
    }
}