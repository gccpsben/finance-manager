import 'reflect-metadata';
import path from "path";
import { EnvManager, RESTfulLogType } from "./env.js";
import { ExtendedLog } from "./debug/extendedLog.js";
import { Server } from "./router/server.js";
import { CreateAppDataSourceError, Database, DatabaseInitError } from "./db/db.js";
import { Decimal } from 'decimal.js';
import { CronRunner } from './crons/cronService.js';

// `main` should be called to initialize the app.
// This is the entry point of the app.

export async function main(envFilePath: string | undefined)
{
    try
    {
        // Set precision of calculations
        Decimal.set({ precision: 32 });

        // Read env file from disk
        {
            const envPath = path.resolve(envFilePath || process.argv[2] || ".env");
            const envReadResult = EnvManager.readEnv(envPath);
            if (!!envReadResult) envReadResult.panic();

            // Log will not be saved to file before env is successfully read
            ExtendedLog.logGreen(`Successfully read env file from "${envPath}"`, false, true);
        }

        // Parse env file
        {
            const envParseResult = EnvManager.parseEnv();
            if (!!envParseResult) envParseResult.panic();

            ExtendedLog.logGreen(`Successfully parsed env file.`, false, true); // Log will not be saved to file before env is successfully parsed

            if (EnvManager.envType === "Development") ExtendedLog.logRed(`EnvType determined to be "${EnvManager.envType}"`);
            else if (EnvManager.envType === 'UnitTest') ExtendedLog.logCyan(`EnvType determined to be "${EnvManager.envType}"`);
            else if (EnvManager.envType === "Production") ExtendedLog.logGreen(`EnvType determined to be "${EnvManager.envType}"`);

            if (!EnvManager.sqliteInMemory)
                ExtendedLog.logMagenta(`SQLite file path resolved to "${EnvManager.sqliteFilePath}"`);
            else
                ExtendedLog.logYellow(`SQLite running in memory mode.`);

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