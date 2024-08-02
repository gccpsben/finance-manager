
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
        "post": `/api/v1/container`,
        "get": `/api/v1/container`
    };
    public static currenciesEndpoints = 
    {
        "post": `/api/v1/currencies`,
        "get": `/api/v1/currencies`
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
    };
}

export async function resetDatabase()
{
    await Database.AppDataSource!.destroy();
    await Database.init();
}

export let serverPort = undefined as undefined | number; 
export let serverURL = undefined as undefined | string;

await (async () => 
{
    await main(".test.env");
    serverPort = EnvManager.serverPort;
    serverURL = `http://localhost:${serverPort}`;

    console.log("");

    const topContext = new Context(``);
    await topContext.describe(`Unit Test`, async function(this: Context)
    {
        await authTests.bind(this)();
        await containerTests.bind(this)();
        await currencyTests.bind(this)();
        await txnTypeTests.bind(this)();
        await transactionTests.bind(this)();
    });
    
    console.log(chalk.green(`\nPassing: ${topContext.successfulCount}`));
    console.log(chalk.red(`Failing: ${topContext.failedCount}\n`));
    for (let err of topContext.errors)
    {
        console.log(chalk.red(`Error in ${err.name}:`));
        console.log(chalk.gray(err.err.stack) + '\n');
    }

    (Server.expressServer as HTTPServer).close();
})();