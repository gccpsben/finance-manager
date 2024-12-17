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
import { MonadError, NestableError, NestableErrorSymbol } from "../std_errors/monadError.js";
import { CurrencyRepository } from "./repositories/currency.repository.js";

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

export class SqliteFilePathMissingError extends MonadError<typeof SqliteFilePathMissingError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(SqliteFilePathMissingError.ERROR_SYMBOL, `EnvManager.sqliteFilePath is not defined.`);
        this.name = this.constructor.name;
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
    public static createAppDataSource(): DataSource | CreateAppDataSourceError<SqliteFilePathMissingError>
    {
        if (!EnvManager.sqliteFilePath && !EnvManager.sqliteInMemory)
            return new CreateAppDataSourceError(new SqliteFilePathMissingError());

        Database.AppDataSource = new DataSource(
        {
            type: "sqlite",
            entities: [User, AccessToken, Currency, Container, Transaction, TxnTag, CurrencyRateDatum, CurrencyRateSource],
            database: EnvManager.sqliteInMemory ? ":memory:" : EnvManager.sqliteFilePath!,
            synchronize: true,
            logging: ['warn'],
            maxQueryExecutionTime: 100
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
            Database.currencyRepository =  new CurrencyRepository(dataSource);
            return dataSource;
        }
        catch(e)
        {
            ExtendedLog.logRed(`Error while initializing database. The database might contain entries violating database constrains.`);
            console.log(e);
            return new DatabaseInitError(e);
        }
    }

    public static getCurrencyRepository() { return this.currencyRepository; }
}