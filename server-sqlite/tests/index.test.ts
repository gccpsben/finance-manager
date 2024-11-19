
import { Database } from '../server_source/db/db.js';
import { main } from '../server_source/entry.js';
import { EnvManager } from '../server_source/env.js';
import chalk from 'chalk';
import { Server } from '../server_source/router/server.js';
import { Server as HTTPServer } from 'http';
import { Context } from './lib/context.js';
import authTests from './auth.test.js';
import containerTests from './container.test.js';
import currencyTests from './currency.test.js';
import txnTypeTests from './txnType.test.js';
import transactionTests from './transaction.test.js';
import calculationsTest, { testForCalculationsInternals } from './calculations.test.js';
import { exit } from 'process';
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

export class UnitTestEndpoints
{
    public static userEndpoints = { "post": "/api/v1/users", };
    public static loginEndpoints = { "post": `/api/v1/auth/login` };
    public static containersEndpoints =
    {
        "post": `/api/v1/containers`,
        "get": `/api/v1/containers`
    };
    public static calculationsEndpoints =
    {
        "expensesAndIncomes": `/api/v1/calculations/expensesAndIncomes`,
        "balanceHistory":  `/api/v1/calculations/balanceHistory`,
        "networthHistory":  `/api/v1/calculations/networthHistory`
    };
    public static currenciesEndpoints =
    {
        "post": `/api/v1/currencies`,
        "get": `/api/v1/currencies`
    };
    public static currenciesRateHistoryEndpoints =
    {
        "get": "/api/v1/currencies/history"
    };
    public static currencyRateDatumsEndpoints =
    {
        "post": `/api/v1/currencyRateDatums`
    };
    public static transactionTypesEndpoints =
    {
        "post": `/api/v1/transactionTypes`,
        "get": `/api/v1/transactionTypes`,
    };
    public static transactionsEndpoints =
    {
        "post": `/api/v1/transactions`,
        "get": `/api/v1/transactions`,
        "put": `/api/v1/transactions`
    };
    public static currencyRateSourcesEndpoints =
    {
        "post": `/api/v1/currencyRateSources`,
        "get": `/api/v1/currencyRateSources`,
    };
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