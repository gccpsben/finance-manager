import { DataSource, LogLevel, QueryRunner } from "typeorm";
import { User } from "./entities/user.entity.ts";
import { AccessToken } from "./entities/accessToken.entity.ts";
import { ExtendedLogger } from "../debug/extendedLog.ts";
import { Currency } from "./entities/currency.entity.ts";
import { Container } from "./entities/container.entity.ts";
import { Transaction } from "./entities/transaction.entity.ts";
import { TxnTag } from "./entities/txnTag.entity.ts";
import { CurrencyRateDatum } from "./entities/currencyRateDatum.entity.ts";
import { CurrencyRateSource } from "./entities/currencyRateSource.entity.ts";
import { MonadError, NestableError, NestableErrorSymbol, panic } from "../std_errors/monadError.ts";
import { CurrencyRepository } from "./repositories/currency.repository.ts";
import { AccessTokenRepository } from "./repositories/accessToken.repository.ts";
import { ContainerRepository } from "./repositories/container.repository.ts";
import { CurrencyRateDatumRepository } from "./repositories/currencyRateDatum.repository.ts";
import { TransactionRepository } from "./repositories/transaction.repository.ts";
import { Fragment } from "./entities/fragment.entity.ts";
import { FileNotFoundError } from "../std_errors/fsErrors.ts";
import { File } from "./entities/file.entity.ts";
import { FileRepository } from "./repositories/file.repository.ts";
import { createReadStream, createWriteStream, readFile, rename, writeFile } from "node:fs";
import { FileReceiver } from "../io/fileReceiver.ts";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { memfs } from "memfs";
import { open } from "node:fs/promises";
import { EnvSettings } from '../env.ts';
import { match } from 'ts-pattern';

export class DatabaseInitError<T extends Error> extends MonadError<typeof DatabaseInitError.ERROR_SYMBOL> implements NestableError
{
    [NestableErrorSymbol]: true = true;
    static readonly ERROR_SYMBOL: unique symbol;

    error: T;
    constructor(err: T)
    {
        super(DatabaseInitError.ERROR_SYMBOL, `Error initializing database.`);
        this.name = this.constructor.name;
        this.error = err;
    }
}

export class DatabaseInitMissingDataSourceError extends MonadError<typeof DatabaseInitMissingDataSourceError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(DatabaseInitMissingDataSourceError.ERROR_SYMBOL, `Database.AppDataSource is not defined. You might need to call Database.createAppDataSource before running this function.`);
        this.name = this.constructor.name;
    }
}

export class CreateAppDataSourceError<T extends Error> extends MonadError<typeof CreateAppDataSourceError.ERROR_SYMBOL> implements NestableError
{
    [NestableErrorSymbol]: true = true;
    static readonly ERROR_SYMBOL: unique symbol;

    error: T;
    constructor(err: T)
    {
        super(CreateAppDataSourceError.ERROR_SYMBOL, `Error creating app data source: ${err}`);
        this.name = this.constructor.name;
        this.error = err;
    }
}

export class AsyncQueue
{
    private running = false;
    private callbacks: (() => void)[] = [];
    public addToQueue(callback: () => Promise<void>)
    {
        this.callbacks.push(callback);
        this.run();
    }
    private async run()
    {
        if (this.running) return;
        while(true)
        {
            if (this.callbacks.length === 0) return void(this.running = false);
            this.running = true;
            await this.callbacks[0]();
            this.callbacks.shift();
        }
    }
}

export class Database
{
    private static logger: ExtendedLogger | null;
    private static currencyRepository: CurrencyRepository | null;
    private static accessTokenRepository: AccessTokenRepository | null;
    private static containerRepository: ContainerRepository | null;
    private static currencyRateDatumRepository: CurrencyRateDatumRepository | null;
    private static transactionRepository: TransactionRepository | null;
    private static filesRepository: FileRepository | null;
    private static fs:
    {
        readFile: typeof readFile,
        writeFile: typeof writeFile,
        createReadStream: typeof createReadStream,
        createWriteStream: typeof createWriteStream,
        rename: typeof rename,
        openPromise: typeof open
    };
    private static fileReceiver: FileReceiver | null;

    private static transactionsQueue = new AsyncQueue();

    public static AppDataSource: DataSource | undefined = undefined;

    /**
     * Create a context for a single transaction. Each context represent a single transaction.
     * Any functions using the query runner inside this context will be included in the same transaction.
     * The initial caller of the chains of method is responsible for calling `endFailure` and `endSuccess` after handling error / success.
     * All of the transactions created using this function will be put into a queue to overcome SQLite/TypeORM single connection limitation.
     * ```
     * ```
     * ***WARN: The database will be locked in a transaction until the `endFailure` and `endSuccess` methods are called.***
     */
    public static createTransactionalContext()
    {
        type ReturnType = {
            endFailure: () => Promise<void>,
            endSuccess: () => Promise<void>,
            queryRunner: QueryRunner,
            attachEndSuccessCallback: (callback: () => void) => number,
            getIsTransactionEnded: () => boolean
        };

        return new Promise<ReturnType>(resolve =>
        {
            this.transactionsQueue.addToQueue(() =>
            {
                return new Promise<void>(resolveInner =>
                {
                    let isEnded = false;
                    const runner = Database.AppDataSource!.createQueryRunner();
                    const endSuccessCallbacks: (() => void)[] = [];
                    const endFailure = async () =>
                    {
                        if (isEnded) return;
                        await runner.rollbackTransaction();
                        await runner.release();
                        resolveInner();
                        isEnded = true;
                    };
                    const endSuccess = async () =>
                    {
                        if (isEnded) return;
                        await runner.commitTransaction();
                        await runner.release();
                        for (const callback of endSuccessCallbacks) callback();
                        resolveInner();
                        isEnded = true;
                    };

                    runner.startTransaction().then(_newSQLTransaction =>
                    {
                        return resolve(
                        {
                            "endFailure": endFailure,
                            "endSuccess": endSuccess,
                            "queryRunner": runner,
                            attachEndSuccessCallback: (callback: () => void) => endSuccessCallbacks.push(callback),
                            getIsTransactionEnded: () => isEnded
                        });
                    });
                });
            });
        });
    }

    public static async init(logger: ExtendedLogger, env: EnvSettings)
        : Promise<DataSource | DatabaseInitError<Error | DatabaseInitMissingDataSourceError>>
    {
        if (!Database.AppDataSource)
            return new DatabaseInitError(new DatabaseInitMissingDataSourceError());

        try
        {
            const dataSource = await Database.AppDataSource.initialize();
            Database.currencyRepository = new CurrencyRepository(dataSource);
            Database.containerRepository = new ContainerRepository(dataSource);
            Database.accessTokenRepository = new AccessTokenRepository(dataSource);
            Database.currencyRateDatumRepository = new CurrencyRateDatumRepository(dataSource);
            Database.transactionRepository = new TransactionRepository(dataSource);
            Database.filesRepository = new FileRepository(dataSource);

            if (env.storage.files.type === 'folderOnDisk')
            {
                Database.fs =
                {
                    createReadStream: createReadStream,
                    createWriteStream: createWriteStream,
                    readFile: readFile,
                    writeFile: writeFile,
                    rename: rename,
                    openPromise: open
                };
            }
            else
            {
                const memfsInstance = memfs({
                    "tmp": null,
                    "files": null
                });

                // TODO: make TS happy here
                Database.fs =
                {
                    // @ts-expect-error Although the types differ, it should be a drop-in-replacement for fs.
                    createReadStream: memfsInstance.fs.createReadStream,
                    // @ts-expect-error Although the types differ, it should be a drop-in-replacement for fs.
                    createWriteStream: memfsInstance.fs.createWriteStream,
                    // @ts-expect-error Although the types differ, it should be a drop-in-replacement for fs.
                    readFile: memfsInstance.fs.readFile,
                    // @ts-expect-error Although the types differ, it should be a drop-in-replacement for fs.
                    writeFile: memfsInstance.fs.writeFile,
                    // @ts-expect-error Although the types differ, it should be a drop-in-replacement for fs.
                    rename: memfsInstance.fs.rename,
                    // @ts-expect-error Although the types differ, it should be a drop-in-replacement for fs.
                    openPromise: memfsInstance.fs.promises.open
                };
            }

            const tempFolderFullPath = getTempFolderPath(env.storage.files);
            const filesFolderFullPath = getFilesStoragePath(env.storage.files);
            if (tempFolderFullPath === null) throw panic(`Temp folder is not found!`); // TODO: Properly handle
            if (filesFolderFullPath === null) throw panic(`Files folder is not found!`); // TODO: Properly handle
            this.fileReceiver = new FileReceiver(
            {
                fs: Database.fs,
                sessionIdGenerator: (_userId: string) => `${randomUUID()}`,
                tempFolderFullPath: tempFolderFullPath,
                filesFolderFullPath: filesFolderFullPath,
                timeoutCheckMs: 1000,
                timeoutMs: 120000,
            });

            return dataSource;
        }
        catch(e)
        {
            logger.logRed(`Error while initializing database. The database might contain entries violating database constrains.`);
            console.log(e);
            return new DatabaseInitError(e instanceof Error ? e : new Error("Generic error: " + e));
        }
    }

    public static getFileReceiver() { return this.fileReceiver; }

    public static getCurrencyRepository() { return this.currencyRepository; }
    public static getAccessTokenRepository() { return this.accessTokenRepository; }
    public static getContainerRepository() { return this.containerRepository; }
    public static getCurrencyRateDatumRepository() { return this.currencyRateDatumRepository; }
    public static getTransactionRepository() { return this.transactionRepository; }
    public static getFileRepository() { return this.filesRepository; }
}

export function getFilesStoragePath(env: EnvSettings['storage']['files'])
{
    return env.type === 'folderOnDisk' ? path.join(env.pathToFolder, '/files') : '/files';
}

export function getTempFolderPath(env: EnvSettings['storage']['files'])
{
    return env.type === 'folderOnDisk' ? path.join(env.pathToFolder, '/tmp') : '/tmp';
}

/** Create a Database data source from the env file. */
export function createAppDataSource(
    env: Readonly<EnvSettings['storage']['db']>
): DataSource | CreateAppDataSourceError<FileNotFoundError>
{
    const entities = [User, AccessToken, Currency, Container, Transaction, TxnTag, CurrencyRateDatum, CurrencyRateSource, Fragment, File];
    const logging = ['warn'] as LogLevel[];
    const maxQueryExecutionTime: number = 1000;

    return match(env.type)
    .with("postgres", _ =>
    {
        if (env.type === 'postgres')
        {
            return new DataSource({
                type: 'postgres' as const,
                entities: entities,
                host: env.hostname,
                username: env.username,
                password: env.password,
                database: env.database,
                port: 5432,
                synchronize: true,
                logging: logging,
                maxQueryExecutionTime: maxQueryExecutionTime,
            });
        }
    })
    .with("sqlite", _ =>
    {
        if (env.type === 'sqlite')
        {
            return new DataSource({
                type: 'sqlite' as const,
                entities: entities,
                database: env.dbPath,
                synchronize: true,
                logging: logging,
                maxQueryExecutionTime: maxQueryExecutionTime,
            });
        }
    })
    .exhaustive()!;
}