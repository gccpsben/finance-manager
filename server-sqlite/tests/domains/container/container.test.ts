/// <reference lib="deno.ns" />

import { resetDatabase } from "../server/helpers.ts";
import { ensureTestIsSetup, port } from "../../init.ts";
import { AuthHelpers } from "../users/helpers.ts";
import { assertEquals } from 'jsr:@std/assert/equals';
import { createPostContainerFunc, createGetContainersFunc } from "./helpers.ts";
import { setupTxnsConCurrRates } from "../helpers.ts";
import { createGetContainerTimelineFunc } from './helpers.ts';
import { assertsPrettyJSON } from '../../lib/assertions.ts';

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

Deno.test(
{
    name: "Check for container timelines correctness",
    async fn(test)
    {
        const testDate = Date.now();
        const transformOffsetDate = (days: number) => Math.round(testDate - days * 8.64e+7);
        await ensureTestIsSetup();
        await resetDatabase();
        const firstUser = Object.values((await AuthHelpers.registerRandMockUsers({port: port!, userCount: 1})))[0];
        const setupResults = await setupTxnsConCurrRates(
        {
            containers:
            [
                { _id: "CONTAINER_1", name: "container 1" },
                { _id: "CONTAINER_2", name: "container 2" },
                { _id: "CONTAINER_3", name: "container 3" }
            ],
            currencies:
            [
                { _id: "CURRENCY_1", isBase: true, name: "base", ticker: "BASE" },
                { _id: "CURRENCY_2", isBase: false, fallbackRateAmount: "1", fallbackRateCurrId: "CURRENCY_1", name: "SEC", ticker: "SEC" },
                { _id: "CURRENCY_3", isBase: false, fallbackRateAmount: "1", fallbackRateCurrId: "CURRENCY_2", name: "THI", ticker: "THI" }
            ],
            token: firstUser.token!,
            transactions:
            [
                {
                    date: transformOffsetDate(90),
                    fragments: [ { to: { amount: "50.0000", currencyId: `CURRENCY_1`, containerId: `CONTAINER_1` } } ]
                },
                {
                    date: transformOffsetDate(80),
                    fragments: [ { to: { amount: "200.0000", currencyId: `CURRENCY_1`, containerId: `CONTAINER_1` } } ]
                },
                {
                    date: transformOffsetDate(77),
                    fragments: [ { to: { amount: "250.0000", currencyId: `CURRENCY_1`, containerId: `CONTAINER_2` } } ]
                },
                {
                    date: transformOffsetDate(75),
                    fragments:
                    [
                        {
                            from: { amount: "99.0000", currencyId: `CURRENCY_1`, containerId: `CONTAINER_1` },
                            to: { amount: "2.0000", currencyId: `CURRENCY_3`, containerId: `CONTAINER_1` }
                        }
                    ]
                },
                {
                    date: transformOffsetDate(55),
                    fragments: [ { to: { amount: "250.0000", currencyId: `CURRENCY_1`, containerId: `CONTAINER_3` } } ]
                },
                {
                    date: transformOffsetDate(50),
                    fragments:
                    [
                        {
                            from: undefined,
                            to: { amount: "14.3", currencyId: `CURRENCY_2`, containerId: `CONTAINER_1` }
                        },
                        {
                            from: { amount: "51.0000", currencyId: `CURRENCY_1`, containerId: `CONTAINER_1` },
                            to: undefined
                        }
                    ]
                }
            ],
            rates: [
                { date: transformOffsetDate(100), refAmount: "150", refAmountCurrId: "CURRENCY_1", refCurrencyId: "CURRENCY_2" },
                { date: transformOffsetDate(80), refAmount: "150", refAmountCurrId: "CURRENCY_1", refCurrencyId: "CURRENCY_2" },
                { date: transformOffsetDate(60), refAmount: "70", refAmountCurrId: "CURRENCY_1", refCurrencyId: "CURRENCY_2" },
                { date: transformOffsetDate(40), refAmount: "50", refAmountCurrId: "CURRENCY_1", refCurrencyId: "CURRENCY_2" },
                { date: transformOffsetDate(20), refAmount: "100", refAmountCurrId: "CURRENCY_1", refCurrencyId: "CURRENCY_2" },
                { date: transformOffsetDate(0), refAmount: "0", refAmountCurrId: "CURRENCY_1", refCurrencyId: "CURRENCY_2" } ,

                { date: transformOffsetDate(100), refAmount: "100", refAmountCurrId: "CURRENCY_2", refCurrencyId: "CURRENCY_3" },
                { date: transformOffsetDate(80), refAmount: "150", refAmountCurrId: "CURRENCY_2", refCurrencyId: "CURRENCY_3" },
                { date: transformOffsetDate(60), refAmount: "25", refAmountCurrId: "CURRENCY_2", refCurrencyId: "CURRENCY_3" },
                { date: transformOffsetDate(40), refAmount: "50", refAmountCurrId: "CURRENCY_2", refCurrencyId: "CURRENCY_3" },
                { date: transformOffsetDate(20), refAmount: "25", refAmountCurrId: "CURRENCY_2", refCurrencyId: "CURRENCY_3" },
                { date: transformOffsetDate(0), refAmount: "1", refAmountCurrId: "CURRENCY_2", refCurrencyId: "CURRENCY_3" },
            ]
        });
        const firstContainerId = Object.values(setupResults.containersMap)[0].containerId;
        const [ baseCurrId, secondCurrId, thirdCurrId ] = Object.values(setupResults.currenciesMap).map(x => x.currencyId);

        await test.step(`Testing Correctness`, async function()
        {
            const res = await createGetContainerTimelineFunc(
            {
                cId: firstContainerId,
                division: 10,
                endDate: transformOffsetDate(0),
                startDate: transformOffsetDate(100)
            })({ token: firstUser.token!, asserts: 'default' });

            const expected = {
                [transformOffsetDate(100)]: {
                    containerBalance: {},
                    containerWorth: "0"
                },
                [transformOffsetDate(90)]: {
                    containerBalance: { [baseCurrId]: "50" },
                    containerWorth: "50"
                },
                [transformOffsetDate(80)]: {
                    containerBalance: { [baseCurrId]: "250" },
                    containerWorth: "250"
                },
                [transformOffsetDate(70)]: {
                    containerBalance: { [baseCurrId]: "151", [thirdCurrId]: "2" },
                    containerWorth: "24401"
                },
                [transformOffsetDate(60)]: {
                    containerBalance: { [baseCurrId]: "151", [thirdCurrId]: "2" },
                    containerWorth: "3651"
                },
                [transformOffsetDate(50)]: {
                    containerBalance: { [baseCurrId]: "100", [thirdCurrId]: "2", [secondCurrId]: "14.3" },
                    containerWorth: "5208"
                },
                [transformOffsetDate(40)]: {
                    containerBalance: { [baseCurrId]: "100", [thirdCurrId]: "2", [secondCurrId]: "14.3" },
                    containerWorth: "5815"
                },
                [transformOffsetDate(30)]: {
                    containerBalance: { [baseCurrId]: "100", [thirdCurrId]: "2", [secondCurrId]: "14.3" },
                    containerWorth: "6172.5"
                },
                [transformOffsetDate(20)]: {
                    containerBalance: { [baseCurrId]: "100", [thirdCurrId]: "2", [secondCurrId]: "14.3" },
                    containerWorth: "6530"
                },
                [transformOffsetDate(10)]: {
                    containerBalance: { [baseCurrId]: "100", [thirdCurrId]: "2", [secondCurrId]: "14.3" },
                    containerWorth: "3315"
                },
            };

            assertsPrettyJSON(res.rawBodyJSON, { timeline: expected });
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});