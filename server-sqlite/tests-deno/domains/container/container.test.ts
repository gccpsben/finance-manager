/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { assertEquals } from 'jsr:@std/assert/equals';
import { createPostContainerFunc, createGetContainersFunc } from "./helpers.ts";

Deno.test(
{
    name: "Reject POST containers without token",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await createPostContainerFunc()
        ({
            token: '',
            asserts: { status: 401 },
            body: ['EXPECTED', { name: "FirstContainer" }],
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject posting containers without name",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await createPostContainerFunc()
        ({
            token: firstUser.token!,
            asserts: { status: 400 },
            body: ['CUSTOM', { }],
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject getting containers without token",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await createGetContainersFunc()
        ({
            token: undefined,
            asserts: { status: 401 },
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Accept containers with valid name",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const containerNamesToPost: string[] = [
            "first container",
            "second container",
            "test container",
            "third container",
            "あいうえお",
            "TESTING",
            "!@%_()*@!$_)!(@&%",
            "123",
            "ABC",
        ];
        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await test.step("Posting containers with valid name", async () =>
        {
            for (const name of containerNamesToPost)
            {
                await createPostContainerFunc()
                ({
                    token: firstUser.token!,
                    asserts: 'default',
                    body: ['EXPECTED', { name }],
                });
            }
        });

        await test.step("Querying all containers", async () =>
        {
            const response = await createGetContainersFunc()
            ({
                token: firstUser.token!,
                asserts: 'default'
            });

            assertEquals(response.parsedBody!.rangeItems.length, containerNamesToPost.length);
            assertEquals(response.parsedBody!.startingIndex, 0);
            assertEquals(response.parsedBody!.endingIndex, containerNamesToPost.length - 1);

            for (const serverContainer of response.parsedBody!.rangeItems.map(x => x.name))
                assertEquals(containerNamesToPost.includes(serverContainer), true);
        });

        await test.step("Querying containers paged", async () =>
        {
            const searchParams = new URLSearchParams({ "start": "0", "end": "5" });
            const response = await createGetContainersFunc(searchParams)
            ({
                token: firstUser.token!,
                asserts: 'default'
            });

            assertEquals(response.parsedBody!.rangeItems.length, 5);
            assertEquals(response.parsedBody!.startingIndex, 0);
            assertEquals(response.parsedBody!.endingIndex, 4);
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject containers with repeated names",
    async fn(test)
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await test.step("Create first container", async () =>
        {
            await createPostContainerFunc()(
            {
                token: firstUser.token!,
                asserts: 'default',
                body: ['EXPECTED', { name: 'MY CONTAINER' }]
            });
        });

        await test.step("Create container with same name", async () =>
        {
            await createPostContainerFunc()(
            {
                token: firstUser.token!,
                asserts: { status: 400 },
                body: ['EXPECTED', { name: 'MY CONTAINER' }]
            });
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});