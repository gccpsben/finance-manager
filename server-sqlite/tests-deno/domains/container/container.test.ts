/// <reference lib="deno.ns" />

import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { getTestServerPath } from '../../init.ts';
import { GET_CONTAINER_API_PATH, POST_CONTAINER_API_PATH } from './paths.ts';
import { PostContainerAPIClass } from "./classes.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { GetContainerAPIClass } from "./classes.ts";
import { assertEquals } from 'jsr:@std/assert/equals';

Deno.test(
{
    name: "Reject containers without token",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_CONTAINER_API_PATH),
            {
                assertStatus: 401, method: "POST",
                body: { name: "FirstContainer"} satisfies PostContainerAPIClass.RequestDTO,
                expectedBodyType: PostContainerAPIClass.ResponseDTO
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});

Deno.test(
{
    name: "Reject containers without name",
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_CONTAINER_API_PATH),
            {
                assertStatus: 400, method: "POST",
                headers: { 'authorization': firstUser.token! },
                body: {  },
                expectedBodyType: PostContainerAPIClass.ResponseDTO
            }
        );
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

        await assertFetchJSON
        (
            path.join(getTestServerPath(), GET_CONTAINER_API_PATH),
            {
                assertStatus: 401, method: "GET",
                expectedBodyType: GetContainerAPIClass.ResponseDTO
            }
        );
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
                await assertFetchJSON
                (
                    path.join(getTestServerPath(), POST_CONTAINER_API_PATH),
                    {
                        assertStatus: 200, method: "POST",
                        headers: { 'authorization': firstUser.token! },
                        body: { name },
                        expectedBodyType: PostContainerAPIClass.ResponseDTO
                    }
                );
            }
        });

        await test.step("Querying all containers", async () =>
        {
            const response = await assertFetchJSON
            (
                path.join(getTestServerPath(), GET_CONTAINER_API_PATH),
                {
                    assertStatus: 200, method: "GET",
                    headers: { 'authorization': firstUser.token! },
                    expectedBodyType: GetContainerAPIClass.ResponseDTO
                }
            );

            assertEquals(response.parsedBody!.rangeItems.length, containerNamesToPost.length);
            assertEquals(response.parsedBody!.startingIndex, 0);
            assertEquals(response.parsedBody!.endingIndex, containerNamesToPost.length - 1);

            for (const serverContainer of response.parsedBody!.rangeItems.map(x => x.name))
                assertEquals(containerNamesToPost.includes(serverContainer), true);
        });

        await test.step("Querying containers paged", async () =>
        {
            const searchParams = new URLSearchParams({ "start": "0", "end": "5" });
            const response = await assertFetchJSON
            (
                path.join(getTestServerPath(), GET_CONTAINER_API_PATH, `?${searchParams}`),
                {
                    assertStatus: 200, method: "GET",
                    headers: { 'authorization': firstUser.token! },
                    expectedBodyType: GetContainerAPIClass.ResponseDTO
                }
            );

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
    async fn()
    {
        await ensureTestIsSetup();
        await resetDatabase();

        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_CONTAINER_API_PATH),
            {
                assertStatus: 200, method: "POST",
                headers: { 'authorization': firstUser.token! },
                body: { name: "Testing Container" },
                expectedBodyType: PostContainerAPIClass.ResponseDTO
            }
        );

        await assertFetchJSON
        (
            path.join(getTestServerPath(), POST_CONTAINER_API_PATH),
            {
                assertStatus: 400, method: "POST",
                headers: { 'authorization': firstUser.token! },
                body: { name: "Testing Container" },
                expectedBodyType: PostContainerAPIClass.ResponseDTO
            }
        );
    },
    sanitizeOps: false,
    sanitizeResources: false
});