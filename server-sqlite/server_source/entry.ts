import process from "node:process";
export function preventEval()
{
    // Lame attempt to limit eval, since `disallow-code-generation-from-strings` breaks depd.
    globalThis.eval = (arg: string) =>
    {
        console.log(`Someone called eval with "${arg}", exiting process.`);
        process.exit(-1);
    };
}

preventEval();

import { EnvManager, RESTfulLogType } from "./env.ts";
import { ExtendedLog } from "./debug/extendedLog.ts";
import { Server } from "./router/server.ts";
import { CreateAppDataSourceError, Database, DatabaseInitError } from "./db/db.ts";
import { Decimal } from 'decimal.js';
import { CronRunner } from './crons/cronService.ts';
import { panic } from './std_errors/monadError.ts';

// `main` should be called to initialize the app.
// This is the entry point of the app.

export async function main(envFilePath: ['path', string | undefined] | ['rawContent', string])
{
    preventEval();

    try
    {
        // Set precision of calculations
        Decimal.set({ precision: 32 });

        // Read env file from disk / Parse env file from raw content.
        {
            const envPath = envFilePath || process.argv[2] || ".env";
            const envReadResult = EnvManager.readEnv(envPath);
            if (!!envReadResult) envReadResult.panic();

            if (EnvManager.currentEnvFilePath[0] === 'path')
            {
                // Log will not be saved to file before env is successfully read
                ExtendedLog.logGreen(`Successfully read env file from "${EnvManager.currentEnvFilePath[1]}"`, false, true);
            }
            else
            {
                ExtendedLog.logGreen(`Successfully read env file from raw string content.`, false, true);
            }
        }

        // Parse env file
        {
            const envParseResult = EnvManager.parseEnv();
            if (!!envParseResult) envParseResult.panic();

            ExtendedLog.logGreen(`Successfully parsed env file.`, false, true); // Log will not be saved to file before env is successfully parsed

            if (EnvManager.envType === "Development") ExtendedLog.logRed(`EnvType determined to be "${EnvManager.envType}"`);
            else if (EnvManager.envType === 'UnitTest') ExtendedLog.logCyan(`EnvType determined to be "${EnvManager.envType}"`);
            else if (EnvManager.envType === "Production") ExtendedLog.logGreen(`EnvType determined to be "${EnvManager.envType}"`);

            if (EnvManager.dataLocation[0] === 'in-memory')
                ExtendedLog.logYellow(`Data location set to in-memory.`);
            else if (EnvManager.dataLocation[0] === 'path')
                ExtendedLog.logYellow(`Data location set to path on disk: "${EnvManager.dataLocation[1]}".`);
            else
                panic(`DataLocation is not correctly loaded in EnvManager: ${EnvManager.dataLocation}`);

            ExtendedLog.logMagenta(`Dist folder path resolved to "${EnvManager.distFolderLocation}"`);

            EnvManager.isSSLDefined() ?
                ExtendedLog.logGreen(`SSL is defined, will run in HTTPS mode.`) :
                ExtendedLog.logYellow(`SSL is not defined, will run in HTTP mode.`);

            if (EnvManager.restfulLogMode === RESTfulLogType.DISABLED) ExtendedLog.logYellow(`RESTFUL logging is disabled.`);
            else if (EnvManager.restfulLogMode === RESTfulLogType.TO_BOTH) ExtendedLog.logGreen(`RESTFUL logging is enabled for file and console.`);
            else if (EnvManager.restfulLogMode === RESTfulLogType.TO_FILE_ONLY) ExtendedLog.logYellow(`RESTFUL logging is enabled only for file.`);
            else if (EnvManager.restfulLogMode === RESTfulLogType.TO_CONSOLE_ONLY) ExtendedLog.logYellow(`RESTFUL logging is enabled only for console.`);
        }

        // Initialize database
        {
            ExtendedLog.logGray(`Initializing AppDataSource and database...`);
            const createAppDataSourceResults = Database.createAppDataSource();

            if (createAppDataSourceResults instanceof CreateAppDataSourceError)
                return createAppDataSourceResults.panic();

            const databaseInitResults = await Database.init();
            if (databaseInitResults instanceof DatabaseInitError)
                return databaseInitResults.panic();

            ExtendedLog.logGreen(`AppDataSource and database successfully initialized.`);
        }

        // Start CRON services
        {
            const cronRunner = new CronRunner();
            await cronRunner.initAll();
            await cronRunner.startAll();
        }

        // Start Server
        {
            if (!EnvManager.serverPort)
                throw panic("Server port is not defined in env.");

            await Server.startServer
            (
                EnvManager.serverPort,
                {
                    attachMorgan: EnvManager.restfulLogMode !== RESTfulLogType.DISABLED
                }
            );
        }
    }
    catch(e)
    {
        ExtendedLog.logRed(e);
    }
}