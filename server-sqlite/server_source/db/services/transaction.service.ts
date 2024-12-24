import { TransactionRepository } from "../repositories/transaction.repository.js";
import { ContainerNotFoundError } from "./container.service.js";
import { CurrencyNotFoundError, CurrencyService } from "./currency.service.js";
import { TransactionTagService, TxnTagNotFoundError } from "./txnTag.service.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { Transaction } from "../entities/transaction.entity.js";
import { Decimal } from "decimal.js";
import type { PartialNull, SQLitePrimitiveOnly } from "../../index.d.js";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { isNullOrUndefined } from "../../router/validation.js";
import { MonadError, panic, unwrap } from "../../std_errors/monadError.js";
import { TxnTag } from "../entities/txnTag.entity.js";
import { DeepPartial, DeleteResult, QueryRunner } from "typeorm/browser";
import { CurrencyToBaseRateCache, GlobalCurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { Database } from "../db.js";
import { CurrencyCache, GlobalCurrencyCache } from "../caches/currencyListCache.cache.js";
import jsonata from "jsonata";
import { TxnQueryASTCalculator } from "../../calculations/txnAST.js";

export class TxnMissingContainerOrCurrency extends MonadError<typeof TxnMissingFromToAmountError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super
        (
            TxnMissingFromToAmountError.ERROR_SYMBOL,
            `If "${nameofT('fromAmount')}" is given, ${nameofT('fromContainerId')} and ${nameofT('fromCurrencyId')} must also be defined, same for to variant.`
        );
        this.name = this.constructor.name;
    }
}

export class TxnMissingFromToAmountError extends MonadError<typeof TxnMissingFromToAmountError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(TxnMissingFromToAmountError.ERROR_SYMBOL, `"${nameofT('fromAmount')}" and ${nameofT('toAmount')} cannot be both undefined.`);
        this.name = this.constructor.name;
    }
}

export class TxnNotFoundError extends MonadError<typeof TxnNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public txnId: string;
    public userId: string;

    constructor(txnId: string, userId: string)
    {
        super(TxnNotFoundError.ERROR_SYMBOL, `Cannot find the given txn with id = ${txnId}`);
        this.name = this.constructor.name;
        this.txnId = txnId;
        this.userId = userId;
    }
}

export class JSONQueryError extends MonadError<typeof JSONQueryError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public jsonQuery: string;
    public queryErrorMessage: string;
    public userId: string;

    constructor(userId: string, queryErrorMessage: string, jsonQuery: string)
    {
        super(JSONQueryError.ERROR_SYMBOL, `The given query "${jsonQuery}" failed with message "${queryErrorMessage}"`);
        this.name = this.constructor.name;
        this.queryErrorMessage = queryErrorMessage;
        this.jsonQuery = jsonQuery;
        this.userId = userId;
    }
}

export type TransactionJSONQueryCurrency =
{
    fallbackRateAmount: string | null;
    fallbackRateCurrencyId: string | null;
    id: string;
    isBase: boolean;
    ticker: string;
};

export type TransactionJSONQueryItem =
{
    title: string,
    creationDate: number,
    description: string | null,
    fromAmount: string | null,
    fromContainerId: string | null,
    fromCurrencyId: string | null,
    fromCurrency: null | TransactionJSONQueryCurrency,
    id: string,
    toAmount: string | null,
    toContainerId: string | null,
    toCurrency: null | TransactionJSONQueryCurrency,
    tagIds: string[]
}

const nameofT = (x: keyof Transaction) => nameof<Transaction>(x);

export class TransactionService
{
    public static async deleteTransactions
    (
        txnIds: string[],
        queryRunner: QueryRunner
    ): Promise<DeleteResult>
    {
        const deletedTxn = await queryRunner.manager.getRepository(Transaction).delete(txnIds);
        return deletedTxn;
    }

    /**
     * Validate if a provided transaction is valid or not.
     * This returns an unsaved version of the txn.
     */
    public static async validateTransaction
    (
        userId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fromAmount?: string,
            fromContainerId?: string,
            fromCurrencyId?: string,
            toAmount?: string | null,
            toContainerId?: string | null,
            toCurrencyId?: string | null,
            txnTagIds: string[]
        }
    ): Promise<
        Transaction |
        UserNotFoundError |
        TxnTagNotFoundError |
        ContainerNotFoundError |
        TxnMissingFromToAmountError |
        TxnMissingContainerOrCurrency |
        CurrencyNotFoundError
    >
    {
        // NOTICE when using TypeORM's `save` method.
        // All undefined properties will be skipped.

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        const currRepo = Database.getCurrencyRepository()!;

        const newTxn: PartialNull<Transaction> = TransactionRepository.getInstance().create();
        newTxn.creationDate = obj.creationDate;
        newTxn.description = obj.description;

        newTxn.title = obj.title;

        // From Amount
        {
            if (obj.fromAmount) newTxn.fromAmount = obj.fromAmount;
            if (obj.fromContainerId)
            {
                const container = await Database.getContainerRepository()!.getContainer(userId, obj.fromContainerId, QUERY_IGNORE);
                if (!container) return new ContainerNotFoundError(obj.fromContainerId, userId);
                newTxn.fromContainerId = container.id;
            }
            if (obj.fromCurrencyId)
            {
                const currency = await currRepo.findCurrencyByIdNameTickerOne(userId, obj.fromCurrencyId, QUERY_IGNORE, QUERY_IGNORE);
                if (!currency) return new CurrencyNotFoundError(obj.fromCurrencyId, userId);
                newTxn.fromCurrencyId = obj.fromCurrencyId;
            }
        }

        // To Amount
        {
            if (obj.toAmount) newTxn.toAmount = obj.toAmount;
            else newTxn.toAmount = null;

            if (obj.toContainerId)
            {
                const container = await Database.getContainerRepository()!.getContainer(userId, obj.toContainerId, QUERY_IGNORE);
                if (!container) return new ContainerNotFoundError(obj.toContainerId, userId);
                newTxn.toContainerId = container.id;
            }
            else { newTxn.toContainerId = null; newTxn.toContainer = null; }

            if (obj.toCurrencyId)
            {
                const currency = await currRepo.findCurrencyByIdNameTickerOne(userId, obj.toCurrencyId, QUERY_IGNORE, QUERY_IGNORE);
                if (!currency) return new CurrencyNotFoundError(obj.toCurrencyId, userId);
                newTxn.toCurrencyId = obj.toCurrencyId;
            }
            else { newTxn.toCurrencyId = null; newTxn.toCurrency = null; }
        }

        if (!obj.fromAmount && !obj.toAmount) return new TxnMissingFromToAmountError();
        if (obj.fromAmount && (!obj.fromContainerId || !obj.fromCurrencyId)) return new TxnMissingContainerOrCurrency();
        if (obj.toAmount && (!obj.toContainerId || !obj.toCurrencyId)) return new TxnMissingContainerOrCurrency();

        const owner = await UserService.getUserById(userId);
        if (!owner) return new UserNotFoundError(userId);

        newTxn.owner = owner;

        const tnxTagObjs: TxnTag[] = [];
        for (const txnTagId of obj.txnTagIds)
        {
            const txnTag = await TransactionTagService.getTxnTagById(userId, txnTagId);
            if (txnTag instanceof UserNotFoundError) return txnTag;
            if (txnTag instanceof TxnTagNotFoundError) return txnTag;
            tnxTagObjs.push(txnTag);
        }

        newTxn.tags = tnxTagObjs;

        // @ts-ignore
        // TODO: fix id null mismatch
        return newTxn;
    }

    public static async updateTransaction
    (
        userId: string,
        targetTxnId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fromAmount?: string,
            fromContainerId?: string,
            fromCurrencyId?: string,
            toAmount?: string | undefined,
            toContainerId?: string | undefined,
            toCurrencyId?: string | undefined,
            tagIds: string[]
        },
        queryRunner: QueryRunner
    )
    {
        const currRepo = Database.getCurrencyRepository()!;
        const contRepo = Database.getContainerRepository()!;

        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        // TODO: Stop using type `Transaction`, this is problematic, temp fix via DeepPartial
        const oldTxn = await queryRunner.manager.getRepository(Transaction).findOne(
        {
            where:
            {
                id: targetTxnId ?? null,
                ownerId: userId ?? null
            }
        }) as DeepPartial<Transaction> | null ;

        if (!oldTxn) return new TxnNotFoundError(targetTxnId, userId);

        // Modify old txn given input manually
        {
            oldTxn.title = obj.title;
            oldTxn.creationDate = obj.creationDate;
            oldTxn.description = obj.description;

            oldTxn.fromAmount = isNullOrUndefined(obj.fromAmount) ? null : obj.fromAmount;

            oldTxn.fromContainerId = obj.fromContainerId ?? null;
            oldTxn.fromContainer = !oldTxn.fromContainerId ? null : await contRepo.getContainer(oldTxn.ownerId!, obj.fromContainerId ?? '', QUERY_IGNORE);

            oldTxn.fromCurrencyId = obj.fromCurrencyId ?? null;
            oldTxn.fromCurrency = !oldTxn.fromCurrencyId ? undefined : {
                id: (await currRepo.findCurrencyByIdNameTickerOne
                (
                    oldTxn.ownerId!,
                    oldTxn.fromCurrencyId,
                    QUERY_IGNORE,
                    QUERY_IGNORE
                ))!.id
            };

            oldTxn.toAmount = isNullOrUndefined(obj.toAmount) ? null : obj.toAmount;

            oldTxn.toContainerId = obj.toContainerId ?? null;
            oldTxn.toContainer = !oldTxn.toContainerId ? null : await contRepo.getContainer(oldTxn.ownerId!, obj.toContainerId ?? '', QUERY_IGNORE);

            oldTxn.toCurrencyId = obj.toCurrencyId ?? null;
            oldTxn.toCurrency = !oldTxn.toCurrencyId ? undefined : {
                id: (await currRepo.findCurrencyByIdNameTickerOne
                (
                    oldTxn.ownerId!,
                    oldTxn.toCurrencyId,
                    QUERY_IGNORE,
                    QUERY_IGNORE
                ))!.id
            };

            {
                let tagObjs: TxnTag[] = [];
                if (!!obj.tagIds)
                {
                    for (const txnTagId of obj.tagIds)
                    {
                        const txnTagObj = await TransactionTagService.getTxnTagById(oldTxn.ownerId!, txnTagId);
                        if (txnTagObj instanceof UserNotFoundError) return txnTagObj;
                        if (txnTagObj instanceof TxnTagNotFoundError) return txnTagObj;
                        tagObjs.push(txnTagObj);
                    }
                }
                oldTxn.tags = tagObjs;
            }
        }

        const txnValidationResults = await TransactionService.validateTransaction(userId, {
            creationDate: oldTxn.creationDate,
            txnTagIds: oldTxn.tags.map(t => t.id!),
            description: oldTxn.description ?? '',
            title: oldTxn.title,
            fromAmount: oldTxn.fromAmount ?? undefined,
            fromContainerId: oldTxn.fromContainerId ?? undefined,
            fromCurrencyId: oldTxn.fromCurrencyId ?? undefined,
            toAmount: oldTxn.toAmount,
            toContainerId: oldTxn.toContainerId,
            toCurrencyId: oldTxn.toCurrencyId
        });

        if (txnValidationResults instanceof UserNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof TxnTagNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof ContainerNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof TxnMissingFromToAmountError) return txnValidationResults;
        if (txnValidationResults instanceof TxnMissingContainerOrCurrency) return txnValidationResults;

        return await queryRunner.manager.getRepository(Transaction).save(oldTxn);
    }

    public static async createTransaction
    (
        userId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fromAmount?: string,
            fromContainerId?: string,
            fromCurrencyId?: string,
            toAmount?: string | undefined,
            toContainerId?: string | undefined,
            toCurrencyId?: string | undefined,
            txnTagIds: string[]
        },
        queryRunner: QueryRunner
    )
    {
        const newTxn = await TransactionService.validateTransaction(userId, obj);
        if (newTxn instanceof UserNotFoundError) return newTxn;
        if (newTxn instanceof TxnTagNotFoundError) return newTxn;
        if (newTxn instanceof TxnMissingFromToAmountError) return newTxn;
        if (newTxn instanceof ContainerNotFoundError) return newTxn;
        if (newTxn instanceof TxnMissingContainerOrCurrency) return newTxn;
        if (newTxn instanceof CurrencyNotFoundError) return newTxn;
        const savedObj = await queryRunner.manager.getRepository(Transaction).save(newTxn);

        if (!savedObj.id)
            throw panic(`Saved rows in the database still got falsy IDs`);

        // Id will always be defined since we saved the obj.
        return savedObj as (typeof savedObj & { id: string });
    }

    public static getTxnValueIncreaseRaw
    (
        from: { amount: string, rate: string } | null,
        to: { amount: string, rate: string } | null
    )
    {
        let fromValue: Decimal | null = null;
        let toValue: Decimal | null = null;

        if (from)
            fromValue = new Decimal(from.amount).mul(new Decimal(from.rate));
        if (to)
            toValue = new Decimal(to.amount).mul(new Decimal(to.rate));

        return (toValue ?? new Decimal('0')).sub(fromValue ?? new Decimal("0"));
    }

    /**
     * Get the change in value of a transaction in base currency value.
     */
    public static async getTxnIncreaseInValue
    (
        userId: string,
        transaction:
        {
            fromAmount?: string | null | undefined,
            toAmount?:string | null | undefined,
            fromCurrencyId?: string | null | undefined,
            toCurrencyId?: string | null | undefined,
            creationDate: number
        },
        cache: CurrencyToBaseRateCache | undefined = GlobalCurrencyToBaseRateCache,
    ): Promise<{ increaseInValue: Decimal } | UserNotFoundError>
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);
        const currRepo = Database.getCurrencyRepository()!;

        const getRate = async (currencyId: string) =>
        {
            let currencyRate = await (async () =>
            {
                // Try getting the currency rate to base at txn's epoch from cache first.
                const amountToBaseValueCacheResult = cache?.queryCurrencyToBaseRate(userId, currencyId, transaction.creationDate);
                if (amountToBaseValueCacheResult) return amountToBaseValueCacheResult.toString();

                // If not available, compute the rate uncached. And finally save the result into cache.
                const currencyRefetched = await currRepo.findCurrencyByIdNameTickerOne(userId, currencyId, QUERY_IGNORE, QUERY_IGNORE);
                const rate =
                (
                    await CurrencyService.rateHydrateCurrency
                    (
                        userId,
                        [currencyRefetched!],
                        transaction.creationDate,
                        cache
                    )
                )[0].rateToBase;

                if (cache) cache.cacheCurrencyToBase(userId, currencyRefetched!.id, transaction.creationDate, new Decimal(rate));
                return rate;
            })();

            return currencyRate;
        };

        return {
            increaseInValue: this.getTxnValueIncreaseRaw(
                !!transaction.fromCurrencyId && !!transaction.fromAmount ? {
                    amount: transaction.fromAmount,
                    rate: await getRate(transaction.fromCurrencyId)
                } : null,
                !!transaction.toCurrencyId && !!transaction.toAmount ? {
                    amount: transaction.toAmount ,
                    rate: await getRate(transaction.toCurrencyId)
                } : null
            )
        }
    }

    public static async getTransactionsJSONQuery
    (
        userId: string,
        query: string,
        cache: CurrencyCache | undefined = GlobalCurrencyCache,
        baseRateCache: CurrencyToBaseRateCache | undefined = GlobalCurrencyToBaseRateCache,
        startIndex: number | null, endIndex: number | null
    )
    {
        if (TxnQueryASTCalculator.areFunctionBindingsInAST(query))
            return new JSONQueryError(userId, `Function bindings are currently prohibited.`, query);

        const currRepo = Database.getCurrencyRepository()!;
        const findCurrById = async (cId: string): Promise<TransactionJSONQueryCurrency | null> =>
        {
            const queryResult = await currRepo.findCurrencyByIdNameTickerOne(userId, cId, QUERY_IGNORE, QUERY_IGNORE, cache);
            return queryResult ? {
                fallbackRateAmount: queryResult.fallbackRateAmount,
                fallbackRateCurrencyId: queryResult.fallbackRateCurrencyId,
                id: queryResult.id,
                isBase: queryResult.isBase,
                ticker: queryResult.ticker,
            } : null;
        };

        const now = Date.now();
        const alias = 'txn';
        let sqlQuery = TransactionRepository.getInstance().createQueryBuilder(alias);
        sqlQuery = sqlQuery.leftJoinAndSelect(`${alias}.${nameofT('tags')}`, "txn_tag")
        sqlQuery = sqlQuery.where(`${alias}.${nameofT('ownerId')} = :ownerId`, { ownerId: userId });
        const sqlResults = await sqlQuery.getManyAndCount();

        // Check if id are all defined.
        if (sqlResults[0].some(x => !x.id))
            throw panic(`Some of the transactions queried from database has falsy primary keys.`);

        const matchedResults: TransactionJSONQueryItem[] = [];
        for (const txn of sqlResults[0].reverse())
        {
            try
            {
                const objToBeMatched =
                {
                    title: txn.title!,
                    creationDate: txn.creationDate!,
                    description: txn.description,
                    fromAmount: txn.fromAmount,
                    fromContainerId: txn.fromContainerId,
                    fromCurrencyId: txn.fromCurrencyId,
                    fromCurrency: txn.fromCurrencyId ? await findCurrById(txn.fromCurrencyId) : null,
                    id: txn.id!,
                    toAmount: txn.toAmount,
                    toContainerId: txn.toContainerId,
                    toCurrency: txn.toCurrencyId ? await findCurrById(txn.toCurrencyId) : null,
                    toCurrencyId: txn.toCurrencyId,
                    tagIds: (txn.tags as { id: string }[]).map(x => x.id) ?? [],
                    tagNames: (txn.tags as { name: string }[]).map(x => x.name) ?? [],
                    changeInValue: 0
                };
                objToBeMatched.changeInValue = unwrap(await TransactionService.getTxnIncreaseInValue(userId, objToBeMatched, baseRateCache)).increaseInValue.toNumber();

                const expression = jsonata(query);
                expression.assign("TITLE", objToBeMatched.title);
                expression.assign("TITLE_LOWER", objToBeMatched.title.toLowerCase());
                expression.assign("TITLE_UPPER", objToBeMatched.title.toUpperCase());
                expression.assign("AGE_MS", now - objToBeMatched.creationDate);
                expression.assign("AGE_SEC", (now - objToBeMatched.creationDate) / 1000);
                expression.assign("AGE_MIN", (now - objToBeMatched.creationDate) / 1000 / 60);
                expression.assign("AGE_HOUR", (now - objToBeMatched.creationDate) / 1000 / 60 / 60);
                expression.assign("AGE_DAY", (now - objToBeMatched.creationDate) / 1000 / 60 / 60 / 24);
                expression.assign("DELTA", objToBeMatched.changeInValue);
                expression.assign("DELTA_NEG", objToBeMatched.changeInValue * -1);
                expression.assign("DELTA_POS", objToBeMatched.changeInValue);
                expression.assign("IS_TRANSFER", (objToBeMatched.fromContainerId && objToBeMatched.toContainerId));
                expression.assign("IS_FROM", (objToBeMatched.fromContainerId && !objToBeMatched.toContainerId));
                expression.assign("IS_TO", (!objToBeMatched.fromContainerId && objToBeMatched.toContainerId));
                expression.assign("WITH_NON_BASE", objToBeMatched.fromCurrency?.isBase === false || objToBeMatched.toCurrency?.isBase === false);
                expression.assign("ONLY_BASE", objToBeMatched.fromCurrency?.isBase === false || objToBeMatched.toCurrency?.isBase === false);
                expression.assign("FROM_TICKER", objToBeMatched.fromCurrency?.ticker ?? null);
                expression.assign("TO_TICKER", objToBeMatched.toCurrency?.ticker ?? null);
                expression.registerFunction("withinInc", (value, minInclusive, maxInclusive) => value >= minInclusive && value <= maxInclusive, "<nnn:b>");
                expression.registerFunction("withinExc", (value, minInclusive, maxInclusive) => value > minInclusive && value < maxInclusive, "<nnn:b>");

                if (await expression.evaluate(objToBeMatched) === true)
                    matchedResults.push(objToBeMatched);
            }
            catch(e) { return new JSONQueryError(userId, `${e.message}`, query); }
        }

        return {
            totalItems: matchedResults.length,
            rangeItems: matchedResults.slice
            (
                startIndex ?? 0,
                endIndex === null ? matchedResults.length + 1 : endIndex + 1
            )
        };
    }

    public static async getTransactions
    (
        userId: string,
        query:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            startDate?: number | undefined, endDate?: number | undefined,
            title?: string,
            id?: string,
            description?: string
        } | undefined = undefined
    )
    {
        const alias = "txn";

        let sqlQuery = TransactionRepository.getInstance().createQueryBuilder(alias);
        sqlQuery = sqlQuery.leftJoinAndSelect(`${alias}.${nameofT('tags')}`, "txn_tag")
        sqlQuery = sqlQuery.orderBy(`${alias}.${nameofT('creationDate')}`, "DESC")
        sqlQuery = sqlQuery.where(`${alias}.${nameofT('ownerId')} = :ownerId`, { ownerId: userId });

        if (query?.id !== undefined)
            sqlQuery = sqlQuery.andWhere(`${alias}.${nameofT('id')} == :target_id`, {target_id: `${query.id}`});

        if (query?.title !== undefined)
            sqlQuery = sqlQuery.andWhere(`${alias}.${nameofT('title')} LIKE :title`, { title: `%${query.title}%` });

        if (query?.description !== undefined)
            sqlQuery = sqlQuery.andWhere(`${alias}.${nameofT('description')} LIKE :description`, { description: `%${query.description}%` });

        if (query?.startDate)
            sqlQuery = sqlQuery.andWhere(`${nameofT('creationDate')} >= :startDate`, { startDate: query.startDate });

        if (query?.endDate)
            sqlQuery = sqlQuery.andWhere(`${nameofT('creationDate')} <= :endDate`, { endDate: query.endDate });

        sqlQuery = ServiceUtils.paginateQuery(sqlQuery, query ?? {});

        const queryResult = await sqlQuery.getManyAndCount();

        // Check if id are all defined.
        if (queryResult[0].some(x => !x.id))
            throw panic(`Some of the transactions queried from database has falsy primary keys.`);

        return {
            totalCount: queryResult[1],
            rangeItems: queryResult[0].map(x => ({
                title: x.title,
                creationDate: x.creationDate,
                description: x.description,
                fromAmount: x.fromAmount,
                fromContainerId: x.fromContainerId,
                fromCurrencyId: x.fromCurrencyId,
                id: x.id,
                ownerId: x.ownerId,
                toAmount: x.toAmount,
                toContainerId: x.toContainerId,
                toCurrencyId: x.toCurrencyId,
                tagIds: (x.tags as { id: string }[]).map(x => x.id) ?? []
            })),
        };
    }

    public static async getUserEarliestTransaction(userId: string): Promise<SQLitePrimitiveOnly<Transaction> | null>
    {
        const nameofT = (x: keyof Transaction) => nameof<Transaction>(x);

        let query = await TransactionRepository.getInstance()
        .createQueryBuilder(`txn`)
        .where(`${nameofT('ownerId')} = :ownerId`, { ownerId: userId ?? null })
        .orderBy(`txn.${nameofT('creationDate')}`, "ASC")
        .limit(1)
        .getOne();

        return query;
    }

    public static async getContainersTransactions(userId: string, containerIds: string[] | { id: string }[])
    {
        const targetContainerIds = ServiceUtils.normalizeEntitiesToIds(containerIds, 'id');

        let query = TransactionRepository.getInstance()
        .createQueryBuilder(`txn`)
        .where(`${nameofT('ownerId')} = :ownerId`, { ownerId: userId ?? null })
        .andWhere
        (
            /*sql*/`
                ${nameofT('fromContainerId')} IN (:...targetContainerIds)
                    OR
                ${nameofT('toContainerId')} IN (:...targetContainerIds)`,
            { targetContainerIds: targetContainerIds }
        );

        return await query.getMany() as SQLitePrimitiveOnly<Transaction>[];
    }
}