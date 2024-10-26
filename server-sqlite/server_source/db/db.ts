import { DataSource } from "typeorm";
import { User } from "./entities/user.entity.js";
import { AccessToken } from "./entities/accessToken.entity.js";
import { EnvManager } from "../env.js";
import { ExtendedLog } from "../logging/extendedLog.js";
import { Currency } from "./entities/currency.entity.js";
import { Container } from "./entities/container.entity.js";
import { Transaction } from "./entities/transaction.entity.js";
import { TransactionType } from "./entities/transactionType.entity.js";
import { CurrencyRateDatum } from "./entities/currencyRateDatum.entity.js";
import { CurrencyRateSource } from "./entities/currencyRateSource.entity.js";
import { MonadError, NestableError, NestableErrorSymbol } from "../stdErrors/monadError.js";

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

export class Database
{
    public static AppDataSource: DataSource | undefined = undefined;

    /** Create a Database data source from the env file. */
    public static createAppDataSource(): DataSource | CreateAppDataSourceError<SqliteFilePathMissingError>
    {
        if (!EnvManager.sqliteFilePath && !EnvManager.sqliteInMemory)
            return new CreateAppDataSourceError(new SqliteFilePathMissingError());

        Database.AppDataSource = new DataSource(
        {
            type: "sqlite",
            entities: [User, AccessToken, Currency, Container, Transaction, TransactionType, CurrencyRateDatum, CurrencyRateSource],
            database: EnvManager.sqliteInMemory ? ":memory:" : EnvManager.sqliteFilePath,
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
            return await Database.AppDataSource.initialize();
        }
        catch(e)
        {
            ExtendedLog.logRed(`Error while initializing database. The database might contain entries violating database constrains.`);
            return new DatabaseInitError(e);
        }
    }
}