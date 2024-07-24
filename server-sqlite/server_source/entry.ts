import 'reflect-metadata';
import path from "path";
import { EnvManager } from "./env.js";
import { ExtendedLog } from "./logging/extendedLog.js";
import { Server } from "./server.js";
import { Database } from "./db/db.js";
try
{
    // Read env file from disk
    (() => 
    {
        const envPath = path.resolve(process.argv[2] || ".env");   
        EnvManager.readEnv(envPath);
        ExtendedLog.logGreen(`Successfully read env file from "${envPath}"`, false, true); // Log will not be saved to file before env is successfully read
    })();

    // Parse env file
    (() => 
    { 
        EnvManager.parseEnv();
        ExtendedLog.logGreen(`Successfully parsed env file.`, false, true); // Log will not be saved to file before env is successfully parsed

        if (EnvManager.envType === "Development") ExtendedLog.logRed(`EnvType determined to be "${EnvManager.envType}"`);
        else if (EnvManager.envType === 'UnitTest') ExtendedLog.logCyan(`EnvType determined to be "${EnvManager.envType}"`);
        else if (EnvManager.envType === "Production") ExtendedLog.logGreen(`EnvType determined to be "${EnvManager.envType}"`);

        ExtendedLog.logMagenta(`SQLite file path resolved to "${EnvManager.sqliteFilePath}"`);
    })();
    
    // Initialize database
    await (async () => 
    {
        ExtendedLog.logGray(`Initializing AppDataSource and database...`);
        Database.createAppDataSource();
        await Database.init();
        ExtendedLog.logGreen(`AppDataSource and database successfully initialized.`);
    })();

    // Start Server
    await (async () => 
    {
        await Server.startServer(EnvManager.serverPort);
    })();
}
catch(e)
{
    ExtendedLog.logRed(e);
}