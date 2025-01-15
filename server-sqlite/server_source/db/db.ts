import { DataSource, QueryRunner } from "typeorm";
import { User } from "./entities/user.entity.js";
import { AccessToken } from "./entities/accessToken.entity.js";
import { EnvManager } from "../env.js";
import { ExtendedLog } from "../debug/extendedLog.js";
import { Currency } from "./entities/currency.entity.js";
import { Container } from "./entities/container.entity.js";
import { Transaction } from "./entities/transaction.entity.js";
import { TxnTag } from "./entities/txnTag.entity.js";
import { CurrencyRateDatum } from "./entities/currencyRateDatum.entity.js";
import { CurrencyRateSource } from "./entities/currencyRateSource.entity.js";
import { MonadError, NestableError, NestableErrorSymbol, panic } from "../std_errors/monadError.js";
import { CurrencyRepository } from "./repositories/currency.repository.js";
import { AccessTokenRepository } from "./repositories/accessToken.repository.js";
import { ContainerRepository } from "./repositories/container.repository.js";
import { CurrencyRateDatumRepository } from "./repositories/currencyRateDatum.repository.js";
import { TransactionRepository } from "./repositories/transaction.repository.js";
import { Fragment } from "./entities/fragment.entity.js";
import { FileNotFoundError } from "../std_errors/fsErrors.js";
import { File } from "./entities/file.entity.js";
import { FileRepository } from "./repositories/file.repository.js";
import { createReadStream, createWriteStream, readFile, rename, writeFile } from "fs";
import { FileReceiver } from "../io/fileReceiver.js";
import { randomUUID } from "crypto";
import path from "path";

export class DatabaseInitError<T extends Error> extends MonadError<typeof DatabaseInitError.ERROR_SYMBOL> implements NestableError
{
    [NestableErrorSymbol]: true;
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
    [NestableErrorSymbol]: true;
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
    private callbacks: Function[] = [];
    public async addToQueue(callback: () => Promise<void>)
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
        rename: typeof rename
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
    public static async createTransactionalContext()
    {
        type ReturnType = {
            endFailure: () => Promise<void>,
            endSuccess: () => Promise<void>,
            queryRunner: QueryRunner,
            attachEndSuccessCallback: (callback: Function) => number,
            getIsTransactionEnded: () => boolean
        };

        return new Promise<ReturnType>(async resolve =>
        {
            this.transactionsQueue.addToQueue(async () =>
            {
                return new Promise<void>(async resolveInner =>
                {
                    let isEnded = false;
                    const runner = Database.AppDataSource!.createQueryRunner();
                    const endSuccessCallbacks: Function[] = [];
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
                    await runner.startTransaction();
                    return resolve(
                    {
                        "endFailure": endFailure,
                        "endSuccess": endSuccess,
                        "queryRunner": runner,
                        attachEndSuccessCallback: (callback: Function) => endSuccessCallbacks.push(callback),
                        getIsTransactionEnded: () => isEnded
                    });
                });
            });
        });
    }

    /** Create a Database data source from the env file. */
    public static createAppDataSource(): DataSource | CreateAppDataSourceError<FileNotFoundError>
    {
        if (EnvManager.dataLocation[0] === 'unloaded') throw panic(`DataLocation is not correct loaded.`);

        Database.AppDataSource = new DataSource(
        {
            type: "better-sqlite3",
            entities: [User, AccessToken, Currency, Container, Transaction, TxnTag, CurrencyRateDatum, CurrencyRateSource, Fragment, File],
            database: EnvManager.dataLocation[0] === 'in-memory' ? ":memory:" : `${EnvManager.dataLocation[1]}/db.db`,
            synchronize: true,
            logging: ['warn'],
            maxQueryExecutionTime: 100,
        });

        return Database.AppDataSource;
    }

    public static async init(): Promise<DataSource | DatabaseInitError<Error | DatabaseInitMissingDataSourceError>>
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

            if (EnvManager.dataLocation[0] === 'path')
            {
                Database.fs =
                {
                    createReadStream: createReadStream,
                    createWriteStream: createWriteStream,
                    readFile: readFile,
                    writeFile: writeFile,
                    rename: rename
                };
            }
            else throw panic(`not done`); // TODO: not done

            const tempFolderFullPath = Database.getTempFolderPath();
            const filesFolderFullPath = Database.getFilesStoragePath();
            if (tempFolderFullPath === null) throw panic(`Temp folder is not found!`); // TODO: Properly handle
            if (filesFolderFullPath === null) throw panic(`Files folder is not found!`); // TODO: Properly handle
            this.fileReceiver = new FileReceiver(
            {
                fs: Database.fs,
                sessionIdGenerator: (userId: string) => `${randomUUID()}`,
                tempFolderFullPath: tempFolderFullPath,
                filesFolderFullPath: filesFolderFullPath,
                timeoutCheckMs: 1000,
                timeoutMs: 120000,
            });

            return dataSource;
        }
        catch(e)
        {
            ExtendedLog.logRed(`Error while initializing database. The database might contain entries violating database constrains.`);
            console.log(e);
            return new DatabaseInitError(e);
        }
    }

    public static getFileReceiver() { return this.fileReceiver; }

    public static getTempFolderPath()
    {
        if (EnvManager.dataLocation[0] === 'unloaded') return null;
        return EnvManager.dataLocation[0] === 'path' ? path.join(EnvManager.dataLocation[1], '/tmp') : '/tmp';
    }

    public static getFilesStoragePath()
    {
        if (EnvManager.dataLocation[0] === 'unloaded') return null;
        return EnvManager.dataLocation[0] === 'path' ? path.join(EnvManager.dataLocation[1], '/files') : '/files';
    }

    public static getCurrencyRepository() { return this.currencyRepository; }
    public static getAccessTokenRepository() { return this.accessTokenRepository; }
    public static getContainerRepository() { return this.containerRepository; }
    public static getCurrencyRateDatumRepository() { return this.currencyRateDatumRepository; }
    public static getTransactionRepository() { return this.transactionRepository; }
    public static getFileRepository() { return this.filesRepository; }
}