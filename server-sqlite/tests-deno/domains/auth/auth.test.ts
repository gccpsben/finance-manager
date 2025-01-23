/// <reference lib="deno.ns" />

import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { resetDatabase } from "../server/helpers.ts";
import { POST_LOGIN_API_PATH } from "./paths.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { PostLoginAPIClass } from "./classes.ts";
import { AuthHelpers } from "../users/helpers.ts";

Deno.test(
{
    name: "Disallow logins with nonexistent user",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_LOGIN_API_PATH),
            {
                assertStatus: 401, method: "POST",
                body: { username: "non-existent", password: "testing" },
                expectedBodyType: PostLoginAPIClass.ResponseDTO
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Disallow logins with incorrect password",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const user1Username = 'user1';
        const user1Password = `password1`;
        const user2Username = 'user2';
        const user2Password = `password2`;

        await test.step("Setting up users", async () =>
        {
            await AuthHelpers.registerMockUsersArray(
            {
                port: port!,
                usersCreds:
                [
                    { username: user1Username, password: user1Password },
                    { username: user2Username, password: user2Password }
                ]
            });
        });

        await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_LOGIN_API_PATH),
            {
                assertStatus: 401, method: "POST",
                body: { username: user1Username, password: user2Password },
                expectedBodyType: PostLoginAPIClass.ResponseDTO
            }
        );

        await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_LOGIN_API_PATH),
            {
                assertStatus: 401, method: "POST",
                body: { username: user2Username, password: user1Password },
                expectedBodyType: PostLoginAPIClass.ResponseDTO
            }
        );

        await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_LOGIN_API_PATH),
            {
                assertStatus: 400, method: "POST",
                body: { username: user2Username },
                expectedBodyType: PostLoginAPIClass.ResponseDTO
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Allow valid logins",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const user1Username = 'user1';
        const user1Password = `password1`;
        const user2Username = 'user2';
        const user2Password = `password2`;

        await test.step("Setting up users", async () =>
        {
            await AuthHelpers.registerMockUsersArray(
            {
                port: port!,
                usersCreds:
                [
                    { username: user1Username, password: user1Password },
                    { username: user2Username, password: user2Password }
                ]
            });
        });

        await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_LOGIN_API_PATH),
            {
                assertStatus: 200, method: "POST",
                body: { username: user1Username, password: user1Password },
                expectedBodyType: PostLoginAPIClass.ResponseDTO
            }
        );

        await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_LOGIN_API_PATH),
            {
                assertStatus: 200, method: "POST",
                body: { username: user2Username, password: user2Password },
                expectedBodyType: PostLoginAPIClass.ResponseDTO
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});