import * as fs from 'node:fs';
import path from 'node:path';
import { MonadError, NestableError, NestableErrorSymbol } from './std_errors/monadError.ts';
import { DirNotFoundError } from './std_errors/fsErrors.ts';
import { Variant } from './index.d.ts';
import validator, { validate } from 'jsonschema';
import envFileSchema from "../env.schema.json" with { type: 'json' };
import { match, P } from 'ts-pattern';
import { isInt, isNumber, isObject, isString } from "npm:class-validator@~0.14.1";

export type EnvType = "Development" | "UnitTest" | "Production";
export type RESTfulLogType = "DISABLED" | "TO_FILE_ONLY" | "TO_CONSOLE_ONLY" | "TO_BOTH";
export function isRESTfulLogType(input: unknown): input is RESTfulLogType
{
    if (!isString(input)) return false;
    return (RESTfulLogTypes as string[]).includes(input);
};

export const RESTfulLogTypes: RESTfulLogType[] = ["DISABLED", "TO_BOTH", "TO_CONSOLE_ONLY", "TO_FILE_ONLY"];

export class ReadEnvError<T extends Error> extends MonadError<typeof ReadEnvError.ERROR_SYMBOL> implements NestableError
{
    [NestableErrorSymbol]: true = true;
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
    [NestableErrorSymbol]: true = true;
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

export class InvalidRESTfulLogTypeInEnvError extends MonadError<typeof InvalidRESTfulLogTypeInEnvError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    logTypeReceived: string;

    constructor(logTypeReceived: string)
    {
        super(InvalidRESTfulLogTypeInEnvError.ERROR_SYMBOL, `RESTful Log type must be one of ${Object.values(RESTfulLogTypes)}, received: ${logTypeReceived}`);
        this.name = this.constructor.name;
        this.logTypeReceived = logTypeReceived;
    }
}

export class GenericEnvParseError extends MonadError<typeof GenericEnvParseError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    msg: string;

    constructor(msg: string)
    {
        super(GenericEnvParseError.ERROR_SYMBOL, msg);
        this.name = this.constructor.name;
        this.msg = msg;
    }
}

export type PostgresDbEnvConfig =
{
    type: "postgres",
    username: string,
    password: string,
    hostname: string,
    database: string
};

export type SqliteDbEnvConfig =
{
    type: 'sqlite',
    dbPath: string | ":memory:"
};

export type StorageSectionFolderOnDisk =
{
    type: "folderOnDisk",
    pathToFolder: string
};

export type StorageSectionInMemory =
{
    type: "inMemory"
};

export type EnvServerSection =
{
    port: number,
    ssl: {
        keyPath: string,
        pemPath: string
    },
    distFolderPath: string
};

export type EnvAuthSection = { tokenExpiryMs: number };
export type EnvStorageSection =
{
    db: PostgresDbEnvConfig | SqliteDbEnvConfig,
    files: StorageSectionFolderOnDisk | StorageSectionInMemory
};
export type EnvLogsSection =
{
    logMode: RESTfulLogType,
    logFolderPath: string
};

// Although the current structure is like env.schema.json,
// do not assume this will be the case going forward.
export type EnvSettings =
{
    nodeEnv: EnvType,
    server: EnvServerSection,
    auth: EnvAuthSection,
    logs: EnvLogsSection,
    storage: EnvStorageSection
};

export function isSSLDefined(env: EnvSettings)
{
    if (env.server.ssl === undefined) return false;
    return env.server.ssl.keyPath !== null &&
    env.server.ssl.pemPath !== null;
}

export function parseServerSection() {

}

export class EnvManager
{
    public static envSource:
        Variant<"fromFilePath", string> |
        Variant<"fromLiteral", string>;

    private static envSettings:
        Variant<"unloaded", null> |
        Variant<"loaded", EnvSettings>;

    public static parseEnv(env:
        Variant<'path', string | undefined> |
        Variant<'rawJson', string>
    ): null | ReadEnvError<DirNotFoundError> | ParseEnvError<
        validator.ValidationError |
        GenericEnvParseError |
        UnknownEnvTypeError |
        InvalidServerPortInEnvError |
        InvalidTokenExpireMsInEnvError |
        InvalidRESTfulLogTypeInEnvError |
        DirNotFoundError
    >
    {
        this.envSource = match(env)
            .with(['path', P.select()], envPath => ['fromFilePath', envPath] as Variant<'fromFilePath', string>)
            .with(['rawJson', P.select()], rawJson => ['fromLiteral', rawJson] as Variant<'fromLiteral', string>)
            .exhaustive();

        const configFileRawJSON = match(env)
        .with(["path", P.select()], (envPath) =>
        {
            const envPathResolved = path.resolve(envPath ?? '.env.json');
            if (!fs.existsSync(envPathResolved))
                return new ReadEnvError(new DirNotFoundError(envPathResolved));
            return fs.readFileSync(envPathResolved).toString();
        })
        .with(["rawJson", P.select()], rawJson => rawJson)
        .exhaustive();
        if (configFileRawJSON instanceof ReadEnvError) return configFileRawJSON;

        const configFileJSON = JSON.parse(configFileRawJSON);

        {
            const envValidationError = validate(
                configFileJSON,
                envFileSchema
            );

            if (!envValidationError.valid && envValidationError.errors.length > 0)
                return new ParseEnvError(envValidationError.errors[0]);
        }

        const data: Partial<EnvSettings> = {};

        {
            if (!configFileJSON.nodeEnv)
                return new ParseEnvError(new GenericEnvParseError(`Cannot find nodeEnv in the provided env.`));

            const loadedEnvType = getEnvType(configFileJSON.nodeEnv);

            if (loadedEnvType instanceof UnknownEnvTypeError)
                return new ParseEnvError(loadedEnvType);

            data.nodeEnv = loadedEnvType;
        }

        // Server section
        {
            const serverSection = parseServerSectionEnv(configFileJSON.server);
            if (serverSection instanceof ParseEnvError) return serverSection;
            data.server = serverSection;
        }

        // Storage section
        {
            const storageSection = parseStorageSectionEnv(configFileJSON.storage);
            if (storageSection instanceof ParseEnvError) return storageSection;
            data.storage = storageSection;
        }

        // Logs section
        {
            const logsSection = parseLogsSectionEnv(configFileJSON.logs);
            if (logsSection instanceof ParseEnvError) return logsSection;
            data.logs = logsSection;
        }

        // Auth section
        {
            const authSection = parseAuthSectionEnv(configFileJSON.auth);
            if (authSection instanceof ParseEnvError) return authSection;
            data.auth = authSection;
        }

        EnvManager.envSettings = [
            'loaded',
            {
                auth: data.auth,
                logs: data.logs,
                nodeEnv: data.nodeEnv,
                server: data.server,
                storage: data.storage
            }
        ];

        return null;
    }

    public static getEnvSettings() {
        return this.envSettings;
    }
}

export function parseStorageSectionEnv(sectionJSON: EnvSettings['storage']):
    ParseEnvError<GenericEnvParseError | InvalidTokenExpireMsInEnvError> | EnvSettings["storage"]
{
    const validatedJSON = sectionJSON as unknown;

    if (!isObject(validatedJSON))
        return new ParseEnvError(new GenericEnvParseError(`The given object is not an object.`));

    if (!("db" in validatedJSON) || !isObject(validatedJSON.db))
        return new ParseEnvError(new GenericEnvParseError(`db is required in storage section, and it must be an object.`));

    if (!("type" in validatedJSON.db) || !isString(validatedJSON.db.type))
        return new ParseEnvError(new GenericEnvParseError(`type is required in storage.db section, and it must be an string.`));

    const dbSection = match(validatedJSON.db.type as EnvSettings['storage']['db']['type'])
        .with("postgres", _ =>
        {
            const db = validatedJSON.db as object;

            if (!("database" in db) || !isString(db.database))
                return new ParseEnvError(new GenericEnvParseError(`database is required in storage.db section, and it must be an string.`));

            if (!("hostname" in db) || !isString(db.hostname))
                return new ParseEnvError(new GenericEnvParseError(`hostname is required in storage.db section, and it must be an string.`));

            if (!("password" in db) || !isString(db.password))
                return new ParseEnvError(new GenericEnvParseError(`password is required in storage.db section, and it must be an string.`));

            if (!("username" in db) || !isString(db.username))
                return new ParseEnvError(new GenericEnvParseError(`username is required in storage.db section, and it must be an string.`));

            return {
                type: 'postgres' as const,
                database: db.database,
                hostname: db.hostname,
                password: db.password,
                username: db.username,
            } satisfies PostgresDbEnvConfig;
        })
        .with("sqlite", _ =>
        {
            const db = validatedJSON.db as object;

            if (!("dbPath" in db) || !isString(db.dbPath))
                return new ParseEnvError(new GenericEnvParseError(`dbPath is required in storage.db section, and it must be an string.`));

            return {
                type: 'sqlite' as const,
                dbPath: db.dbPath,
            };
        })
        .otherwise(_ => new ParseEnvError(new GenericEnvParseError(`The given db type is not supported.`)));

    if (dbSection instanceof ParseEnvError) return dbSection;

    if (!("files" in validatedJSON) || !isObject(validatedJSON.files))
        return new ParseEnvError(new GenericEnvParseError(`files is required in storage section, and it must be an object.`));

    if (!("type" in validatedJSON.files) || !isString(validatedJSON.files.type))
        return new ParseEnvError(new GenericEnvParseError(`type is required in storage.files section, and it must be an string.`));

    const filesSection = match(validatedJSON.files.type  as EnvSettings['storage']['files']['type'])
        .with("folderOnDisk", _ =>
        {
            const files = validatedJSON.files as object;

            if (!("pathToFolder" in files) || !isString(files.pathToFolder))
                return new ParseEnvError(new GenericEnvParseError(`pathToFolder is required in storage.files section, and it must be an string.`));

            return {
                type: "folderOnDisk" as const,
                pathToFolder: files.pathToFolder
            }
        })
        .with("inMemory", _ => ({ type: "inMemory" as const }))
        .otherwise(() => new ParseEnvError(new GenericEnvParseError(`Unsupported storage.files.type.`)));

    if (filesSection instanceof ParseEnvError) return filesSection;

    return {
        files: filesSection,
        db: dbSection
    }
}

export function parseAuthSectionEnv(sectionJSON: EnvSettings['auth']):
    ParseEnvError<GenericEnvParseError | InvalidTokenExpireMsInEnvError> | EnvSettings["auth"]
{
    const validatedJSON = sectionJSON as unknown;

    if (!isObject(validatedJSON))
        return new ParseEnvError(new GenericEnvParseError(`The given object is not an object.`));

    const authJSON: Partial<EnvSettings["auth"]> = {};

    const tokenExpiryMs = match(authJSON.tokenExpiryMs as unknown)
        .with(P.union(undefined, null), () => 1000 * 60 * 60 * 24 * 7)
        .with(P.number, value => value)
        .otherwise(() => new ParseEnvError(new InvalidTokenExpireMsInEnvError(`${authJSON.tokenExpiryMs}`)));
    if (tokenExpiryMs instanceof ParseEnvError) return tokenExpiryMs;

    return {
        tokenExpiryMs: tokenExpiryMs!
    }
}

export function parseLogsSectionEnv(sectionJSON: EnvSettings['logs']):
    ParseEnvError<GenericEnvParseError | InvalidRESTfulLogTypeInEnvError> | EnvSettings["logs"]
{
    const validatedJSON = sectionJSON as unknown;

    if (!isObject(validatedJSON))
        return new ParseEnvError(new GenericEnvParseError(`The given object is not an object.`));

    if (!("logMode" in validatedJSON) || !isString(validatedJSON.logMode))
        return new ParseEnvError(new GenericEnvParseError(`logMode is required in logs section, and it must be a string.`));

    if (!isRESTfulLogType(validatedJSON.logMode))
        return new ParseEnvError(new InvalidRESTfulLogTypeInEnvError(validatedJSON.logMode));

    if (!("logFolderPath" in validatedJSON) || !isString(validatedJSON.logFolderPath))
        return new ParseEnvError(new GenericEnvParseError(`logFolderPath is required in logs section, and it must be a string.`));

    // Logs section
    const logsJSON: Partial<EnvSettings["logs"]> = {};

    logsJSON.logMode = validatedJSON.logMode;
    if (logsJSON.logMode === undefined || logsJSON.logMode === null)
        return new ParseEnvError(new GenericEnvParseError(`Cannot find logs.logMode in the config file.`));

    logsJSON.logFolderPath = validatedJSON.logFolderPath;
    logsJSON.logMode = validatedJSON.logMode;

    return {
        logMode: logsJSON.logMode,
        logFolderPath: logsJSON.logFolderPath
    };
}

export function parseServerSectionEnv(sectionJSON: EnvSettings['server']):
    ParseEnvError<GenericEnvParseError | InvalidServerPortInEnvError> | EnvSettings["server"]
{
    const validatedJSON = sectionJSON as unknown;

    if (!isObject(validatedJSON))
        return new ParseEnvError(new GenericEnvParseError(`The given object is not an object.`));

    if (!("port" in validatedJSON) || !isNumber(validatedJSON.port))
        return new ParseEnvError(new GenericEnvParseError(`Port is required in server section, and it must be a number.`));

    if (!(isInt(validatedJSON.port % 2) && validatedJSON.port >= 1 && validatedJSON.port <= 65535))
        return new ParseEnvError(new InvalidServerPortInEnvError(`${validatedJSON.port}`));

    if (!("distFolderPath" in validatedJSON) || !isString(validatedJSON.distFolderPath))
        return new ParseEnvError(new GenericEnvParseError(`'distFolderPath' is required in server section, and it must be a string.`));

    if (("ssl" in validatedJSON) && !isObject(validatedJSON.ssl))
        return new ParseEnvError(new GenericEnvParseError(`'ssl' must be an object if defined.`));

    const serverJSON: Partial<EnvSettings["server"]> = {};

    serverJSON.port = validatedJSON.port;
    serverJSON.distFolderPath = validatedJSON.distFolderPath;

    if ('ssl' in validatedJSON && isObject(validatedJSON.ssl))
    {
        const sslSection: Partial<EnvSettings['server']['ssl']> = {};

        if (!("keyPath" in validatedJSON.ssl) || !("pemPath" in validatedJSON.ssl) || !isString(validatedJSON.ssl.keyPath) || !isString(validatedJSON.ssl.pemPath))
            return new ParseEnvError(new GenericEnvParseError(`keyPath and pemPath must be strings in ssl.`));

        sslSection.keyPath = validatedJSON.ssl.keyPath;
        if (sslSection.keyPath === undefined || sslSection.keyPath === null)
            return new ParseEnvError(new GenericEnvParseError(`Cannot find server.ssl.keyPath in the config file.`));

        sslSection.pemPath = validatedJSON.ssl.pemPath;
        if (sslSection.pemPath === undefined || sslSection.pemPath === null)
            return new ParseEnvError(new GenericEnvParseError(`Cannot find server.ssl.pemPath in the config file.`));

        serverJSON.ssl = { keyPath: sslSection.keyPath!, pemPath: sslSection.pemPath!,  };
    }

    return {
        distFolderPath: serverJSON.distFolderPath!,
        port: serverJSON.port,
        ssl: serverJSON.ssl!
    };
}

export function getEnvType(envString: string): EnvType | UnknownEnvTypeError
{
    const envTypeRaw = envString.toLowerCase();
    if (envTypeRaw == "development") return "Development";
    if (envTypeRaw == "dev") return "Development";
    if (envTypeRaw == "test") return "UnitTest";
    if (envTypeRaw == "tests") return "UnitTest";
    if (envTypeRaw == "unit") return "UnitTest";
    if (envTypeRaw == "prod") return "Production";
    if (envTypeRaw == "production") return "Production";
    return new UnknownEnvTypeError(envTypeRaw);
}