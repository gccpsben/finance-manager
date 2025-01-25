/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { AuthHelpers} from "./helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { createPostUserFunc } from './helpers.ts';

Deno.test(
{
    name: "Disallow creating invalid users",
    async fn(test)
    {
        await ensureTestIsSetup();

        await test.step("No body", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', {  }]
            });
        });

        await test.step("No password", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { username: "Testing" }]
            });
        });

        await test.step("No username", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { password: "Testing" }]
            });
        });

        await test.step("Username incorrect type", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { password: "pass", username: 385012 }]
            });
        });

        await test.step("Password incorrect type", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { password: 58103854, username: "user" }]
            });
        });

        await test.step("Password null or undefined", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { password: null, username: "user" }]
            });

            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { password: undefined, username: "user" }]
            });
        });

        await test.step("Username null or undefined", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { username: null, password: "pass"  }]
            });

            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['CUSTOM', { username: undefined, password: "pass" }]
            });
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

        await createPostUserFunc()
        ({
            token: undefined,
            asserts: 'default',
            body: ['EXPECTED', { username: "MY_USER", password: "Testing" }]
        });

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
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: 'default',
                body: ['EXPECTED', { username: "MY_USER", password: "Testing" }]
            });
        });

        await test.step("Creating second user with same name", async () =>
        {
            await createPostUserFunc()
            ({
                token: undefined,
                asserts: { status: 400 },
                body: ['EXPECTED', { username: "MY_USER", password: "Testing but new" }]
            });
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});