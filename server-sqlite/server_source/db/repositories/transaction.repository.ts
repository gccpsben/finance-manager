import { DataSource, DeepPartial, DeleteResult, QueryRunner, Repository } from "typeorm";
import { Transaction } from "../entities/transaction.entity.js";
import { Database } from "../db.js";
import { panic, unwrap } from "../../std_errors/monadError.js";
import { MeteredRepository } from "../meteredRepository.js";
import { CurrencyCache } from "../caches/currencyListCache.cache.js";
import { UserNotFoundError, UserService } from "../services/user.service.js";
import { JSONQueryError, TransactionJSONQueryCurrency, TransactionJSONQueryItem, TransactionService, TxnMissingContainerOrCurrency, TxnMissingFromToAmountError, TxnNotFoundError } from "../services/transaction.service.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { TxnTag } from "../entities/txnTag.entity.js";
import { TransactionTagService, TxnTagNotFoundError } from "../services/txnTag.service.js";
import { ContainerNotFoundError } from "../services/container.service.js";
import { CurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.js";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { TxnQueryASTCalculator } from "../../calculations/txnAST.js";
import jsonata from "jsonata";
import { nameof, ServiceUtils } from "../servicesUtils.js";
import { CurrencyNotFoundError } from "../services/currency.service.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { isNullOrUndefined } from "../../router/validation.js";

const nameofT = (x: keyof Transaction) => nameof<Transaction>(x);

export class TransactionRepository extends MeteredRepository
{
    #dataSource: DataSource;
    #repository: Repository<Transaction>;

    public async deleteTransactions
    (
        txnIds: string[],
        queryRunner: QueryRunner
    ): Promise<DeleteResult>
    {
        const deletedTxn = await queryRunner.manager.getRepository(Transaction).delete(txnIds);
        return deletedTxn;
    }

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(Transaction);
    }

    public async updateTransaction
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
        queryRunner: QueryRunner,
        currencyListCache: CurrencyCache | null
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
                    QUERY_IGNORE,
                    currencyListCache
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
                    QUERY_IGNORE,
                    currencyListCache
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
        }, currencyListCache);

        if (txnValidationResults instanceof UserNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof TxnTagNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof ContainerNotFoundError) return txnValidationResults;
        if (txnValidationResults instanceof TxnMissingFromToAmountError) return txnValidationResults;
        if (txnValidationResults instanceof TxnMissingContainerOrCurrency) return txnValidationResults;

        return await queryRunner.manager.getRepository(Transaction).save(oldTxn);
    }

    public async getTransactionsJSONQuery
    (
        userId: string,
        query: string,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        baseRateCache: CurrencyToBaseRateCache | null,
        currencyListCache: CurrencyCache | null,
        startIndex: number | null, endIndex: number | null
    )
    {
        if (TxnQueryASTCalculator.areFunctionBindingsInAST(query))
            return new JSONQueryError(userId, `Function bindings are currently prohibited.`, query);

        const [now, alias, currRepo] = [Date.now(), 'txn', Database.getCurrencyRepository()!];
        const findCurrById = async (cId: string): Promise<TransactionJSONQueryCurrency | null> =>
        {
            const queryResult = await currRepo.findCurrencyByIdNameTickerOne(userId, cId, QUERY_IGNORE, QUERY_IGNORE, currencyListCache);
            return queryResult ? {
                fallbackRateAmount: queryResult.fallbackRateAmount,
                fallbackRateCurrencyId: queryResult.fallbackRateCurrencyId,
                id: queryResult.id,
                isBase: queryResult.isBase,
                ticker: queryResult.ticker,
            } : null;
        };

        let sqlQuery = this.#repository.createQueryBuilder(alias);
        sqlQuery = sqlQuery.leftJoinAndSelect(`${alias}.${nameofT('tags')}`, "txn_tag")
        sqlQuery = sqlQuery.where(`${alias}.${nameofT('ownerId')} = :ownerId`, { ownerId: userId });
        const sqlResults = await sqlQuery.getManyAndCount();

        // Check if id are all defined.
        if (sqlResults[0].some(x => !x.id))
            throw panic(`Some of the transactions queried from database has falsy primary keys.`);

        const expression = jsonata(query);
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

                // Only calculate delta if it is referenced in the query
                const tokensAST = TxnQueryASTCalculator.flattenASTTokens(expression.ast());
                const isTokenInExpr = (token: string) => tokensAST.some(t => t.name === token || t.value === token);
                if (["DELTA", "DELTA_NEG", "DELTA_POS", "changeInValue"].some(x => isTokenInExpr(x)))
                {
                    objToBeMatched.changeInValue = unwrap(
                        await TransactionService.getTxnIncreaseInValue(userId, objToBeMatched, currencyRateDatumsCache, baseRateCache, currencyListCache)
                    ).increaseInValue.toNumber();
                }

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

    public async createTransaction
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
        queryRunner: QueryRunner,
        currencyListCache: CurrencyCache | null
    )
    {
        const newTxn = await TransactionService.validateTransaction(userId, obj, currencyListCache);
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

    public async getTransactions
    (
        userId: string,
        query:
        {
            startIndex?: number | undefined, endIndex?: number | undefined,
            startDate?: number | undefined, endDate?: number | undefined,
            title?: string, id?: string, description?: string
        } | undefined = undefined
    )
    {
        const alias = "txn";

        let sqlQuery = this.#repository.createQueryBuilder(alias);
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

        sqlQuery.orderBy(nameofT('creationDate'), 'DESC');
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

    public async getUserEarliestTransaction(userId: string): Promise<SQLitePrimitiveOnly<Transaction> | null>
    {
        const nameofT = (x: keyof Transaction) => nameof<Transaction>(x);

        let query = await this.#repository
        .createQueryBuilder(`txn`)
        .where(`${nameofT('ownerId')} = :ownerId`, { ownerId: userId ?? null })
        .orderBy(`txn.${nameofT('creationDate')}`, "ASC")
        .limit(1)
        .getOne();

        return query;
    }

    public async getContainersTransactions(userId: string, containerIds: string[] | { id: string }[])
    {
        const targetContainerIds = ServiceUtils.normalizeEntitiesToIds(containerIds, 'id');

        let query = this.#repository
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