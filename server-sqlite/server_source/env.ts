import * as fs from 'fs';
import { ExtendedLog } from './extendedLog.js';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import path = require('path');
import { isInt, isNumber, IsNumber, isNumberString, ValidateBy } from 'class-validator';
export type EnvType = "Development" | "UnitTest" | "Production";

export class EnvManager
{
    public static serverPort = undefined as undefined | number;
    public static currentEnvFilePath = undefined as undefined | string;
    public static distFolderLocation = undefined as undefined | string;
    public static sqliteFilePath = undefined as undefined | string;
    public static envType:EnvType = "Production";

    public static readEnv(filePath:string)
    {
        if (!filePath) throw new Error(`You must provide a filePath for loadEnv.`);

        EnvManager.currentEnvFilePath = filePath || process.argv[2] || ".env";
        EnvManager.currentEnvFilePath = path.resolve(EnvManager.currentEnvFilePath);
        if (!fs.existsSync(EnvManager.currentEnvFilePath)) throw new Error(`Cannot find env file ${EnvManager.currentEnvFilePath}`);

        dotenvExpand.expand(dotenv.config({path:  EnvManager.currentEnvFilePath}));
    }

    public static parseEnv()
    {
        const buildNotDefinedMsg = (keyName:string) => `${keyName} is not defined in env file. (Received "${process.env[keyName]}")`;

        (() => 
        {
            if (!process.env.NODE_ENV) throw new Error(buildNotDefinedMsg(`NODE_ENV`));
            this.envType = EnvManager.getEnvType();
        })();

        (() => 
        {
            if (!process.env.SQLITE_FILE_PATH) throw new Error(buildNotDefinedMsg(`SQLITE_FILE_PATH`));
            this.sqliteFilePath = path.resolve(process.env.SQLITE_FILE_PATH); 
        })();

        (() => 
        {
            if (!process.env.SERVER_PORT) throw new Error(buildNotDefinedMsg(`SERVER_PORT`));
            if (!isNumberString(process.env.SERVER_PORT)) throw new Error(`SERVER_PORT is must be a number. (Received "${process.env.SERVER_PORT}")`);
            if (!isInt(parseFloat(process.env.SERVER_PORT))) throw new Error(`SERVER_PORT is must be an int. (Received "${process.env.SERVER_PORT}")`);      
            EnvManager.serverPort = parseInt(process.env.SERVER_PORT);
        })();
    }

    public static getEnvType(): EnvType
    {
        if (process.env.NODE_ENV.toLowerCase() == "development") return "Development";
        if (process.env.NODE_ENV.toLowerCase() == "dev") return "Development";
        if (process.env.NODE_ENV.toLowerCase() == "test") return "UnitTest";
        if (process.env.NODE_ENV.toLowerCase() == "tests") return "UnitTest";
        if (process.env.NODE_ENV.toLowerCase() == "unit") return "UnitTest";
        if (process.env.NODE_ENV.toLowerCase() == "prod") return "Production";
        if (process.env.NODE_ENV.toLowerCase() == "production") return "Production";
        throw new Error(`Unknown NODE_ENV type!`);
    }
}