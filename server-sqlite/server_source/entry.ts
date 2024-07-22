import path from "path";
import { EnvManager } from "./env.js";
import { ExtendedLog } from "./extendedLog.js";
import { Server } from "./server.js";
try
{
    // Read env file from disk
    (() => 
    {
        const envPath = path.resolve(process.argv[2] || ".env");   
        EnvManager.readEnv(envPath);
        ExtendedLog.logGreen(`Successfully read env file from "${envPath}"`);
    })();

    // Parse env file
    (() => 
    {
        EnvManager.parseEnv();
        ExtendedLog.logGreen(`Successfully parsed env file.`);

        if (EnvManager.envType === "Development") ExtendedLog.logRed(`EnvType determined to be "${EnvManager.envType}"`);
        else if (EnvManager.envType === 'UnitTest') ExtendedLog.logCyan(`EnvType determined to be "${EnvManager.envType}"`);
        else if (EnvManager.envType === "Production") ExtendedLog.logGreen(`EnvType determined to be "${EnvManager.envType}"`);
    })();

    // Start Server
    await (async () => 
    {
        await Server.startServer();
    })();
}
catch(e)
{
    ExtendedLog.logRed(e);
}