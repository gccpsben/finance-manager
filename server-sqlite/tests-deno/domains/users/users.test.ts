/// <reference lib="deno.ns" />

import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { resetDatabase } from "../server/helpers.ts";
import { AuthHelpers } from "./helpers.ts";
import { POST_USER_API_PATH } from "./paths.ts";
import { ensureTestIsSetup, port } from "../../init.ts";

Deno.test(
{
    name: "Disallow creating invalid users",
    async fn(test)
    {
        await ensureTestIsSetup();

        await test.step("No body", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { }
                }
            );
        });

        await test.step("No password", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { username: "Testing" }
                }
            );
        });

        await test.step("No username", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { password: "Testing" }
                }
            );
        });

        await test.step("Username incorrect type", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { password: "pass", username: 385012 }
                }
            );
        });

        await test.step("Password incorrect type", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { password: 58103854, username: "user" }
                }
            );
        });

        await test.step("Password null or undefined", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { password: null, username: "user" }
                }
            );

            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { password: undefined, username: "user" }
                }
            );
        });

        await test.step("Username null or undefined", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { username: null, password: "pass" }
                }
            );

            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { username: undefined, password: "pass" }
                }
            );
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Allow creating valid users",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_USER_API_PATH),
            {
                assertStatus: 200, method: "POST",
                body: { username: "MY_USER", password: "Testing" }
            }
        );

        await AuthHelpers.registerRandMockUsers({ port: port!, userCount: 10 });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Disallow users with same name",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await test.step("Creating first user", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 200, method: "POST",
                    body: { username: "MY_USER", password: "Testing" }
                }
            );
        });

        await test.step("Creating second user with same name", async () =>
        {
            await assertFetchJSON
            (
                path.join(`http://localhost:${port}`, POST_USER_API_PATH),
                {
                    assertStatus: 400, method: "POST",
                    body: { username: "MY_USER", password: "Testing but new" }
                }
            );
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});