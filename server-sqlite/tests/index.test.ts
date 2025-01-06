
import { Database } from '../server_source/db/db.js';
import { main } from '../server_source/entry.js';
import { EnvManager } from '../server_source/env.js';
import chalk from 'chalk';
import { Server } from '../server_source/router/server.js';
import { Server as HTTPServer } from 'http';
import { Context } from './lib/context.js';
import authTests from './suites/auth/index.test.js';
import containerTests from './suites/container/index.test.js';
import currencyTests from './suites/currency/index.test.js';
import txnTypeTests from './suites/txnTag/index.test.js';
import transactionTests from './suites/transaction/index.test.js';
import currencyRateSrcs from './suites/currencyRateSource/index.test.js';
import calculationsTest, { testForCalculationsInternals } from './suites/calculations/index.test.js';
import { exit } from 'process';
import { GetCurrencyRateSrcAPI, DeleteCurrencyRateSrcAPI } from '../../api-types/currencyRateSource.js';
import { GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI } from '../../api-types/calculations.js';
import { GetTxnJsonQueryAPI } from '../../api-types/txn.js';
import { GetContainerTimelineAPI } from '../../api-types/container.js';
export type HTTPMethod = "GET" | "PATCH" | "POST" | "DELETE";

export type TestUserEntry =
{
    username: string,
    password: string,
    token?: string | undefined,
    baseCurrencyId?: string | undefined
};
export type TestUserDict =
{
    [key: string]: TestUserEntry
};

export const TESTS_ENDPOINTS =
{
    "users": { "post": "/api/v1/users" },
    "login": { "post": `/api/v1/auth/login` },
    "containers":
    {
        "post": `/api/v1/containers`,
        "get": `/api/v1/containers`,
    },
    "containers-timelines":
    {
        get: (cId: string, division: number, startDate?: number | undefined, endDate?: number | undefined) =>
        {
            const urlSearchParams = new URLSearchParams(
            {
                ...(startDate === undefined ? {} : { "startDate": startDate.toString() }),
                ...(endDate === undefined ? {} : { "endDate": endDate.toString() }),
                "division": division.toString(),
                "containerId": cId
            } satisfies GetContainerTimelineAPI.RequestQueryDTO);
            return `/api/v1/containers/timeline?${urlSearchParams.toString()}` satisfies GetContainerTimelineAPI.Path<string>
        },
        getWithoutParams: () =>
            `/api/v1/containers/timeline` satisfies GetContainerTimelineAPI.Path<string>,
    },
    "calculations-expensesAndIncomes":
    {
        "get": `/api/v1/calculations/expensesAndIncomes`
    },
    "calculations-balanceHistory":
    {
        get: (startDate: number, endDate: number, division: number) =>
            `/api/v1/calculations/balanceHistory?startDate=${startDate}&endDate=${endDate}&division=${division}` satisfies GetUserBalanceHistoryAPI.Path<string>,
        getWithoutParams: () =>
            `/api/v1/calculations/balanceHistory` satisfies GetUserBalanceHistoryAPI.Path<string>,
    },
    "calculations-networthHistory":
    {
        get: (startDate: number, endDate: number, division: number) =>
            `/api/v1/calculations/networthHistory?startDate=${startDate}&endDate=${endDate}&division=${division}` satisfies GetUserNetworthHistoryAPI.Path<string>,
        getWithoutParams: () =>
            `/api/v1/calculations/networthHistory` satisfies GetUserNetworthHistoryAPI.Path<string>,
    },
    "currencies":
    {
        "post": `/api/v1/currencies`,
        "get": `/api/v1/currencies`
    },
    "currencies-rate-history": {
        "get": "/api/v1/currencies/history"
    },
    "currencyRateDatums": { "post": `/api/v1/currencyRateDatums` },
    "transactionTags":
    {
        "post": `/api/v1/transactionTags`,
        "get": `/api/v1/transactionTags`,
    },
    "transactions":
    {
        "post": `/api/v1/transactions`,
        "get": `/api/v1/transactions`,
        "put": `/api/v1/transactions`,
        "delete": `/api/v1/transactions`,
        "get-jsonquery": `/api/v1/transactions/json-query` satisfies GetTxnJsonQueryAPI.Path
    },
    "currencyRateSources":
    {
        "post": `/api/v1/currencyRateSources`,
        get: <T extends string>(cid: T) =>
            `/api/v1/${cid}/currencyRateSources` satisfies GetCurrencyRateSrcAPI.Path<T>
        ,
        delete: <T extends string>(cid: T) =>
            `/api/v1/currencyRateSources/${cid}` satisfies DeleteCurrencyRateSrcAPI.Path<T>
    }
}

export async function resetDatabase()
{
    await Database.AppDataSource!.destroy();
    await Database.init();
}

export let serverPort: number;
export let serverURL: string;

await (async () =>
{
    await main(".test.env");

    if (!EnvManager.serverPort)
        throw new Error(`Unit Tests cannot start because port is not defined in the env file.`);

    serverPort = EnvManager.serverPort;
    serverURL = `http://localhost:${serverPort}`;

    console.log("");

    const topContext = new Context(``);

    await topContext.describe(`Internals`, async function(this: Context)
    {
        await testForCalculationsInternals.bind(this)();
    });

    console.log("");

    await topContext.describe(`Endpoints`, async function(this: Context)
    {
        await authTests.bind(this)();
        await containerTests.bind(this)();
        await currencyTests.bind(this)();
        await currencyRateSrcs.bind(this)();
        await txnTypeTests.bind(this)();
        await transactionTests.bind(this)();
        await calculationsTest.bind(this)();
    });

    console.log(chalk.green(`\nPassing: ${topContext.successfulCount}`));
    console.log(chalk.red(`Failing: ${topContext.failedCount}\n`));
    for (let err of topContext.errors)
    {
        console.log(chalk.red(`Error in ${err.name}:`));
        console.log(chalk.gray(err.err.stack) + '\n');
    }

    (Server.expressServer as HTTPServer).close();
    exit();
})();