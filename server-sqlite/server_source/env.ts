import * as fs from 'fs';
import { ExtendedLog } from './logging/extendedLog.js';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { isInt, isNumber, IsNumber, isNumberString, ValidateBy } from 'class-validator';
import path from 'path';
import fsExtra from 'fs-extra/esm';
export type EnvType = "Development" | "UnitTest" | "Production";

export class EnvManager
{
    public static serverPort = undefined as undefined | number;
    public static currentEnvFilePath = undefined as undefined | string;
    public static distFolderLocation = undefined as undefined | string;
    public static sqliteFilePath = undefined as undefined | string;
    public static logsFolderPath = undefined as undefined | string;
    public static tokenExpiryMs = undefined as undefined | number;
    public static envType:EnvType = "Production";

    public static readEnv(filePath:string)
    {
        if (!filePath) throw new Error(`You must provide a filePath for loadEnv.`);

        EnvManager.currentEnvFilePath = filePath || process.argv[2] || ".env";
        EnvManager.currentEnvFilePath = path.resolve(EnvManager.currentEnvFilePath);
        if (!fs.existsSync(EnvManager.currentEnvFilePath)) throw new Error(`Cannot find env file ${EnvManager.currentEnvFilePath}`);

        dotenvExpand.expand(dotenv.config({path: EnvManager.currentEnvFilePath}));
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
            if (!isNumberString(process.env.SERVER_PORT)) throw new Error(`SERVER_PORT must be a number. (Received "${process.env.SERVER_PORT}")`);
            if (!isInt(parseFloat(process.env.SERVER_PORT))) throw new Error(`SERVER_PORT must be an int. (Received "${process.env.SERVER_PORT}")`);      
            EnvManager.serverPort = parseInt(process.env.SERVER_PORT);
        })();

        (() => 
        {
            if (!process.env.LOGS_FOLDER_PATH) throw new Error(buildNotDefinedMsg(`LOGS_FOLDER_PATH`));
            const parsedPath = path.resolve(process.env.LOGS_FOLDER_PATH);
            if (!fsExtra.pathExistsSync(parsedPath)) throw new Error(`Path "${parsedPath}" is not found!`);
            const stat = fs.lstatSync(parsedPath);
            if (!stat.isDirectory()) throw new Error(`Path "${parsedPath}" is not a directory.`);
            EnvManager.logsFolderPath = parsedPath;
        })();

        (() => 
        { 
            const keyName = `DIST_FOLDER_PATH`;
            if (!process.env[keyName]) throw new Error(buildNotDefinedMsg(keyName));
            const parsedPath = path.resolve(process.env[keyName]);
            if (!fsExtra.pathExistsSync(parsedPath)) throw new Error(`Path "${parsedPath}" is not found!`);
            const stat = fs.lstatSync(parsedPath);
            if (!stat.isDirectory()) throw new Error(`Path "${parsedPath}" is not a directory.`);
            EnvManager.distFolderLocation = parsedPath;
        })();

        (() => 
        {
            const keyName = `TOKEN_EXPIRE_MS`;
            if (!process.env[keyName]) throw new Error(buildNotDefinedMsg(keyName));
            if (!isNumberString(process.env[keyName])) throw new Error(`${keyName} must be a number. (Recevied "${process.env[keyName]}")`);
            if (!isInt(parseFloat(process.env[keyName]))) throw new Error(`SERVER_PORT must be an int. (Received "${process.env[keyName]}")`);
            EnvManager.tokenExpiryMs = parseInt(process.env[keyName]);
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