import * as fs from 'fs';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { isInt, isNumberString } from 'class-validator';
import path from 'path';
import fsExtra from 'fs-extra';
import { MonadError, NestableError, NestableErrorSymbol } from './std_errors/monadError.js';
import { DirNotFoundError } from './std_errors/fsErrors.js';
import { Variant } from './index.d.js';
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

export class DataLocationNotFoundError extends MonadError<typeof DataLocationNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    path: string;

    constructor(path: string)
    {
        super(DataLocationNotFoundError.ERROR_SYMBOL, `The given data location "${path}" is either not found or not a directory.`);
        this.name = this.constructor.name;
        this.path = path;
    }
}

export class EnvManager
{
    public static currentEnvFilePath = ['unloaded', undefined] as Variant<'unloaded', undefined> |
                                                                  Variant<'path', string | undefined> |
                                                                  Variant<'rawContent', string>;
    public static dataLocation = ["unloaded", undefined] as Variant<"unloaded", undefined> |
                                                            Variant<"path", string> |
                                                            Variant<"in-memory", undefined>;

    public static serverPort = undefined as undefined | number;
    public static distFolderLocation = undefined as undefined | string;

    public static logsFolderPath = undefined as undefined | string;
    public static sslPemFullPath = undefined as undefined | string;
    public static sslKeyFullPath = undefined as undefined | string;
    public static tokenExpiryMs = undefined as undefined | number;
    public static restfulLogMode: RESTfulLogType;
    public static envType:EnvType = "Production";

    public static readEnv
    (
        env:
            Variant<'path', string|undefined> |
            Variant<'rawContent', string>

    ): undefined | ReadEnvError<DirNotFoundError | Error>
    {
        try
        {
            const envMode = env[0];
            if (envMode === 'path') // Read env from path
            {
                const envPath = path.resolve(env[1] || process.argv[2] || ".env");
                EnvManager.currentEnvFilePath = ['path', envPath];
                if (!fs.existsSync(envPath))
                    return new ReadEnvError(new DirNotFoundError(envPath));
                dotenvExpand.expand(dotenv.config({ path: envPath }));
            }
            else // envMode === 'rawContent'
            {
                const envContent = env[1];
                EnvManager.currentEnvFilePath = ['rawContent', envContent];
                dotenvExpand.expand({ parsed: dotenv.parse(envContent) });
            }
        }
        catch(e) { return new ReadEnvError(e); }
    }

    public static parseEnv(): null | ParseEnvError<
        UnknownEnvTypeError |
        DataLocationNotFoundError |
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

        dataLocation:
        {
            const dataLocation = process.env.DATA_LOCATION;
            if (dataLocation === ':memory:')
            {
                EnvManager.dataLocation = ['in-memory', undefined];
                break dataLocation;
            }

            if (dataLocation === undefined || !fsExtra.pathExistsSync(dataLocation))
                return new ParseEnvError(new DataLocationNotFoundError(dataLocation ?? '<undefined>'));
            else EnvManager.dataLocation = ['path', dataLocation];
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