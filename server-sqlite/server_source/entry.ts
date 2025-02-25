import process from "node:process";
import { match, P } from 'ts-pattern';

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

import { EnvManager, isSSLDefined } from "./env.ts";
import { ExtendedLogger } from "./debug/extendedLog.ts";
import { Server } from "./router/server.ts";
import { createAppDataSource, CreateAppDataSourceError, Database, DatabaseInitError } from "./db/db.ts";
import { Decimal } from 'decimal.js';
import { panic } from './std_errors/monadError.ts';
import { green, red } from "jsr:@std/internal@^1.0.5/styles";

// `main` should be called to initialize the app.
// This is the entry point of the app.

export async function main(envFilePath: ['path', string | undefined] | ['rawContent', string])
{
    preventEval();
    let logger: ExtendedLogger | null = null;

    try
    {
        // Set precision of calculations
        Decimal.set({ precision: 32 });

        // Read env file from disk / Parse env file from raw content.
        {
            const envPath = envFilePath || process.argv[2] || ".env";
            const envReadResult = EnvManager.readEnv(envPath);
            if (envReadResult) envReadResult.panic();

            // Log will not be saved to file before env is successfully read
            match(EnvManager.envSource)
                .with(['fromFilePath', P._], () =>
                    console.log(green(`Successfully read env file from "${EnvManager.envSource[1]}"`)))
                .with(['fromLiteral', P._], () =>
                    console.log(green(`Successfully read env file from raw string content.`)))
                .exhaustive();
        }

        const envParseResult = EnvManager.parseEnv();
        if (envParseResult !== null) envParseResult.panic();

        const loadedEnv = match(EnvManager.getEnvSettings())
        .with(["unloaded", P._], () => { throw panic(`Error in main loop: EnvManager reported env is not loaded and parsed yet.`) })
        .with(["loaded", P.select()], env => env)
        .exhaustive();

        // Parse env file
        {
            logger = new ExtendedLogger();
            logger.logGreen(`Successfully parsed env file.`, false, true); // Log will not be saved to file before env is successfully parsed

            match(loadedEnv.envType)
            .with("Development", () => logger!.logRed(`EnvType determined to be "${loadedEnv.envType}"`))
            .with("UnitTest", () => logger!.logCyan(`EnvType determined to be "${loadedEnv.envType}"`))
            .with("Production", () => logger!.logGreen(`EnvType determined to be "${loadedEnv.envType}"`))
            .exhaustive();

            if (loadedEnv.dataLocation[0] === 'in-memory')
                logger.logYellow(`Data location set to in-memory.`);
            else if (loadedEnv.dataLocation[0] === 'path')
                logger.logYellow(`Data location set to path on disk: "${loadedEnv.dataLocation[1]}".`);
            else
                panic(`DataLocation is not correctly loaded in EnvManager: ${loadedEnv.dataLocation}`);

            logger.logMagenta(`Dist folder path resolved to "${loadedEnv.distFolderLocation}"`);

            isSSLDefined(loadedEnv) ?
                logger.logGreen(`SSL is defined, will run in HTTPS mode.`) :
                logger.logYellow(`SSL is not defined, will run in HTTP mode.`);

            match(loadedEnv.restfulLogMode)
                .with("DISABLED", () => logger!.logYellow(`RESTFUL logging is disabled.`))
                .with("TO_BOTH", () => logger!.logGreen(`RESTFUL logging is enabled for file and console.`))
                .with("TO_FILE_ONLY", () => logger!.logYellow(`RESTFUL logging is enabled only for file.`))
                .with("TO_CONSOLE_ONLY", () => logger!.logYellow(`RESTFUL logging is enabled only for console.`))
                .exhaustive();
        }

        // Initialize database
        {
            logger.logGray(`Initializing AppDataSource and database...`);
            const createAppDataSourceResults = createAppDataSource(loadedEnv);
            if (createAppDataSourceResults instanceof CreateAppDataSourceError)
                return createAppDataSourceResults.panic();

            Database.AppDataSource = createAppDataSourceResults;
            const databaseInitResults = await Database.init(logger, loadedEnv);
            if (databaseInitResults instanceof DatabaseInitError)
                return databaseInitResults.panic();

            logger.logGreen(`AppDataSource and database successfully initialized.`);
        }

        // Start Server
        {
            if (!loadedEnv.serverPort)
                throw panic("Server port is not defined in env.");

            return await Server.startServer
            (
                loadedEnv.serverPort,
                { attachMorgan: loadedEnv.restfulLogMode !== "DISABLED" },
                logger,
                loadedEnv
            );
        }
    }
    catch(e)
    {
        if (logger) logger.logRed(e);
        else console.log(red(`${e}`));
    }
}