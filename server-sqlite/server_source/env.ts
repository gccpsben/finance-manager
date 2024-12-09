import * as fs from 'fs';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { isInt, isNumberString } from 'class-validator';
import path from 'path';
import fsExtra from 'fs-extra/esm';
import { MonadError, NestableError, NestableErrorSymbol } from './std_errors/monadError.js';
import { DirNotFoundError } from './std_errors/fsErrors.js';
export type EnvType = "Development" | "UnitTest" | "Production";
export enum RESTfulLogType { "DISABLED","TO_FILE_ONLY","TO_CONSOLE_ONLY","TO_BOTH" };

export class ReadEnvError<T extends Error> extends MonadError<typeof ReadEnvError.ERROR_SYMBOL> implements NestableError
{
    [NestableErrorSymbol]: true;
    static readonly ERROR_SYMBOL: unique symbol;

    error: T;
    constructor(err: T)
    {
        super(ReadEnvError.ERROR_SYMBOL, `Error reading env file: ${err}`);
        this.name = this.constructor.name;
        this.error = err;
    }
}

export class ParseEnvError<T extends Error> extends MonadError<typeof ParseEnvError.ERROR_SYMBOL> implements NestableError
{
    [NestableErrorSymbol]: true;
    static readonly ERROR_SYMBOL: unique symbol;

    error: T;
    constructor(err: T)
    {
        super(ParseEnvError.ERROR_SYMBOL, `Error parsing env file: ${err}`);
        this.name = this.constructor.name;
        this.error = err;
    }
}

export class UnknownEnvTypeError extends MonadError<typeof UnknownEnvTypeError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor(envTypeReceived: string)
    {
        super(UnknownEnvTypeError.ERROR_SYMBOL, `Unknown env type detected, received: ${envTypeReceived}`);
        this.name = this.constructor.name;
    }
}

export class MissingSqliteConfigInEnvError extends MonadError<typeof MissingSqliteConfigInEnvError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(MissingSqliteConfigInEnvError.ERROR_SYMBOL, `SQLITE_FILE_PATH is not defined in env file and SQLITE_IN_MEMORY is not set to true.`);
        this.name = this.constructor.name;
    }
}

export class InvalidSqliteConfigInEnvError extends MonadError<typeof InvalidSqliteConfigInEnvError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(InvalidSqliteConfigInEnvError.ERROR_SYMBOL, `SQLITE_FILE_PATH cannot be defined if SQLITE_IN_MEMORY is set to true.`);
        this.name = this.constructor.name;
    }
}

export class InvalidServerPortInEnvError extends MonadError<typeof InvalidServerPortInEnvError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    serverPortReceived: string;

    constructor(serverPortReceived: string)
    {
        super(InvalidServerPortInEnvError.ERROR_SYMBOL, `SERVER_PORT must be a number and an int. (Received "${serverPortReceived}")`);
        this.name = this.constructor.name;
        this.serverPortReceived = serverPortReceived;
    }
}

export class InvalidTokenExpireMsInEnvError extends MonadError<typeof InvalidTokenExpireMsInEnvError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    tokenExpireMsReceived: string;

    constructor(tokenExpireMsReceived: string)
    {
        super(InvalidTokenExpireMsInEnvError.ERROR_SYMBOL, `TOKEN_EXPIRE_MS must be a number and an int. (Received "${tokenExpireMsReceived}")`);
        this.name = this.constructor.name;
        this.tokenExpireMsReceived = tokenExpireMsReceived;
    }
}

export class MissingPropInEnvError extends MonadError<typeof MissingPropInEnvError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    fieldName: string;

    constructor(fieldName: string)
    {
        super(MissingPropInEnvError.ERROR_SYMBOL, `Missing required field in env file: "${fieldName}"`);
        this.name = this.constructor.name;
        this.fieldName = fieldName;
    }
}

export class InvalidRESTfulLogTypeInEnvError extends MonadError<typeof InvalidRESTfulLogTypeInEnvError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    logTypeReceived: string;

    constructor(logTypeReceived: string)
    {
        super(InvalidRESTfulLogTypeInEnvError.ERROR_SYMBOL, `RESTful Log type must be one of ${Object.keys(RESTfulLogType)}, received: ${logTypeReceived}`);
        this.name = this.constructor.name;
        this.logTypeReceived = logTypeReceived;
    }
}

export class EnvManager
{
    public static serverPort = undefined as undefined | number;
    public static currentEnvFilePath = undefined as undefined | string;
    public static distFolderLocation = undefined as undefined | string;
    public static sqliteFilePath = undefined as undefined | string;
    public static sqliteInMemory = false;
    public static logsFolderPath = undefined as undefined | string;
    public static sslPemFullPath = undefined as undefined | string;
    public static sslKeyFullPath = undefined as undefined | string;
    public static tokenExpiryMs = undefined as undefined | number;
    public static restfulLogMode: RESTfulLogType;
    public static envType:EnvType = "Production";

    public static readEnv(filePath:string): undefined | ReadEnvError<DirNotFoundError | Error>
    {
        try
        {
            EnvManager.currentEnvFilePath = filePath || process.argv[2] || ".env";
            EnvManager.currentEnvFilePath = path.resolve(EnvManager.currentEnvFilePath);
            if (!fs.existsSync(EnvManager.currentEnvFilePath))
                return new ReadEnvError(new DirNotFoundError(EnvManager.currentEnvFilePath));

            dotenvExpand.expand(dotenv.config({path: EnvManager.currentEnvFilePath}));
        }
        catch(e) { return new ReadEnvError(e); }
    }

    public static parseEnv(): null | ParseEnvError<
        UnknownEnvTypeError |
        MissingSqliteConfigInEnvError |
        InvalidSqliteConfigInEnvError |
        InvalidServerPortInEnvError |
        MissingPropInEnvError |
        InvalidTokenExpireMsInEnvError |
        InvalidRESTfulLogTypeInEnvError |
        DirNotFoundError
    >
    {
        {
            if (!process.env.NODE_ENV)
                return new ParseEnvError(new MissingPropInEnvError(`NODE_ENV`));

            const loadedEnvType = EnvManager.getEnvType();

            if (loadedEnvType instanceof UnknownEnvTypeError)
                return new ParseEnvError(loadedEnvType);

            this.envType = loadedEnvType;
        }

        {
            const sqliteInMemory = process.env.SQLITE_IN_MEMORY === 'true';
            const sqliteFilePath = process.env.SQLITE_FILE_PATH;

            if (!sqliteInMemory && !sqliteFilePath)
                return new ParseEnvError(new MissingSqliteConfigInEnvError());
            if (sqliteFilePath && sqliteInMemory)
                return new ParseEnvError(new InvalidSqliteConfigInEnvError());

            if (!sqliteInMemory) EnvManager.sqliteFilePath = path.resolve(process.env.SQLITE_FILE_PATH!);
            else EnvManager.sqliteInMemory = true;
        }

        {
            if (!process.env.SERVER_PORT)
                return new ParseEnvError(new MissingPropInEnvError(`SERVER_PORT`));

            if (!isNumberString(process.env.SERVER_PORT) || !isInt(parseFloat(process.env.SERVER_PORT)))
                return new ParseEnvError(new InvalidServerPortInEnvError(process.env.SERVER_PORT));

            EnvManager.serverPort = parseInt(process.env.SERVER_PORT);
        }

        {
            if (!process.env.LOGS_FOLDER_PATH)
                return new ParseEnvError(new MissingPropInEnvError(`LOGS_FOLDER_PATH`));

            const parsedPath = path.resolve(process.env.LOGS_FOLDER_PATH);

            if (!fsExtra.pathExistsSync(parsedPath))
                return new ParseEnvError(new DirNotFoundError(parsedPath));

            const stat = fs.lstatSync(parsedPath);

            if (!stat.isDirectory())
                return new ParseEnvError(new DirNotFoundError(parsedPath));

            EnvManager.logsFolderPath = parsedPath;
        }

        {
            const keyName = `DIST_FOLDER_PATH`;
            if (!process.env[keyName])
                return new ParseEnvError(new MissingPropInEnvError(keyName));

            const parsedPath = path.resolve(process.env[keyName]);
            if (!fsExtra.pathExistsSync(parsedPath))
                return new ParseEnvError(new DirNotFoundError(parsedPath));

            const stat = fs.lstatSync(parsedPath);

            if (!stat.isDirectory())
                return new ParseEnvError(new DirNotFoundError(parsedPath));

            EnvManager.distFolderLocation = parsedPath;
        }

        {
            const keyName = `TOKEN_EXPIRE_MS`;
            if (!process.env[keyName])
                return new ParseEnvError(new MissingPropInEnvError(keyName));

            if (!isNumberString(process.env[keyName]) || !isInt(parseFloat(process.env[keyName])))
                return new ParseEnvError(new InvalidTokenExpireMsInEnvError(process.env[keyName]))

            EnvManager.tokenExpiryMs = parseInt(process.env[keyName]);
        }

        ssl: {
            const sslKeyPathKeyName = `SSL_KEY_PATH`;
            const sslPemPathKeyName = `SSL_PEM_PATH`;

            const sslEnabled = process.env[sslKeyPathKeyName] && process.env[sslPemPathKeyName];
            if (!sslEnabled) break ssl;

            if (!process.env[sslKeyPathKeyName]) return new ParseEnvError(new MissingPropInEnvError(sslKeyPathKeyName));
            if (!process.env[sslPemPathKeyName]) return new ParseEnvError(new MissingPropInEnvError(sslPemPathKeyName));

            EnvManager.sslKeyFullPath = path.resolve(path.join(process.cwd(), process.env[sslKeyPathKeyName]));
            EnvManager.sslPemFullPath = path.resolve(path.join(process.cwd(), process.env[sslPemPathKeyName]));
        }

        restLog: {
            const keyName = `RESTFUL_LOG_MODE`;
            const keyValue = process.env[keyName];

            if (!keyValue)
            {
                EnvManager.restfulLogMode = RESTfulLogType.TO_BOTH;
                break restLog;
            }

            if (!(keyValue in RESTfulLogType))
                return new ParseEnvError(new InvalidRESTfulLogTypeInEnvError(keyValue));
            else
                EnvManager.restfulLogMode = RESTfulLogType[keyValue as keyof typeof RESTfulLogType];
        }

        return null;
    }

    public static isSSLDefined() { return this.sslKeyFullPath && this.sslPemFullPath }

    public static getEnvType(): EnvType | UnknownEnvTypeError
    {
        const envTypeRaw = (process.env.NODE_ENV ?? "").toLowerCase();
        if (envTypeRaw == "development") return "Development";
        if (envTypeRaw == "dev") return "Development";
        if (envTypeRaw == "test") return "UnitTest";
        if (envTypeRaw == "tests") return "UnitTest";
        if (envTypeRaw == "unit") return "UnitTest";
        if (envTypeRaw == "prod") return "Production";
        if (envTypeRaw == "production") return "Production";
        return new UnknownEnvTypeError(envTypeRaw);
    }
}