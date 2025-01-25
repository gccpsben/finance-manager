/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { createLoginToUserFunc } from "./helpers.ts";

Deno.test(
{
    name: "Disallow logins with nonexistent user",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await createLoginToUserFunc()
        ({
            token: undefined,
            body: ['EXPECTED', { username: "non-existent", password: "testing" }],
            asserts: { status: 401 }
        });
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

        await test.step("Incorrect Password (1)", async () =>
        {
            await createLoginToUserFunc()
            ({
                token: undefined,
                body: ['EXPECTED', { username: user1Username, password: user2Password }],
                asserts: { status: 401 }
            });
        });

        await test.step("Incorrect Password (2)", async () =>
        {
            await createLoginToUserFunc()
            ({
                token: undefined,
                body: ['EXPECTED', { username: user2Username, password: user1Password }],
                asserts: { status: 401 }
            });
        });

        await test.step("Missing Username Props", async () =>
        {
            await createLoginToUserFunc()
            ({
                token: undefined,
                body: ['CUSTOM', { password: user1Password }],
                asserts: { status: 400 }
            });
        });

        await test.step("Missing Password Props", async () =>
        {
            await createLoginToUserFunc()
            ({
                token: undefined,
                body: ['CUSTOM', { username: user2Username }],
                asserts: { status: 400 }
            });
        });
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

        await createLoginToUserFunc()
        ({
            token: undefined,
            body: ['EXPECTED', { username: user1Username, password: user1Password }],
            asserts: 'default'
        });

        await createLoginToUserFunc()
        ({
            token: undefined,
            body: ['EXPECTED', { username: user2Username, password: user2Password }],
            asserts: 'default'
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});