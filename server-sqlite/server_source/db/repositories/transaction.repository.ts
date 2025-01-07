import { DataSource, DeleteResult, QueryRunner, Repository } from "typeorm";
import { nameofT, Transaction } from "../entities/transaction.entity.js";
import { Database } from "../db.js";
import { panic, unwrap } from "../../std_errors/monadError.js";
import { MeteredRepository } from "../meteredRepository.js";
import { CurrencyCache } from "../caches/currencyListCache.cache.js";
import { UserNotFoundError, UserService } from "../services/user.service.js";
import { JSONQueryError, TransactionJSONQueryCurrency, TransactionJSONQueryItem, TransactionService } from "../services/transaction.service.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { TxnTag } from "../entities/txnTag.entity.js";
import { TxnTagNotFoundError } from "../services/txnTag.service.js";
import { CurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.js";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { TxnQueryASTCalculator } from "../../calculations/txnAST.js";
import jsonata from "jsonata";
import { ServiceUtils } from "../servicesUtils.js";
import { Fragment, FragmentRaw, nameofF } from "../entities/fragment.entity.js";

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
        // Delete all fragments of the transactions
        for (const id of txnIds)
            await queryRunner.manager.getRepository(Fragment).delete({ parentTxnId: id });

        const deletedTxn = await queryRunner.manager.getRepository(Transaction).delete(txnIds);
        return deletedTxn;
    }

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(Transaction);
    }

    /**
     * Attempt to update previously added transactions.
     * This function perform MINIMAL validations logics.
     */
    public async updateTransaction
    (
        userId: string,
        targetTxnId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fragments: FragmentRaw[],
            tagIds: string[],
            excludedFromIncomesExpenses: boolean
        },
        queryRunner: QueryRunner
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        // Delete old fragments
        await queryRunner.manager.getRepository(Fragment).delete({ parentTxnId: targetTxnId });

        // Re-save new fragments
        const savedFragments = await this.saveFragmentsOfTxn(userId,
        {
            ...obj,
            parentTxnId: targetTxnId
        }, queryRunner);

        // Get all txn tags
        const tags: TxnTag[] = [];
        for (const tagId of obj.tagIds)
        {
            const tag = await queryRunner.manager.getRepository(TxnTag).findOne({where: { ownerId: userId, id: tagId }});
            if (tag === null) return new TxnTagNotFoundError({ id: tagId }, userId);
            tags.push(tag);
        }

        return await queryRunner.manager.getRepository(Transaction).save(
        {
            id: targetTxnId,
            ...obj,
            tags: tags,
            fragments: savedFragments
        });
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
        const findCurrByTicker = async (ticker: string): Promise<TransactionJSONQueryCurrency | null> =>
        {
            const queryResult = await currRepo.findCurrencyByIdNameTickerOne(userId, QUERY_IGNORE, QUERY_IGNORE, ticker, currencyListCache);
            return queryResult ? {
                fallbackRateAmount: queryResult.fallbackRateAmount,
                fallbackRateCurrencyId: queryResult.fallbackRateCurrencyId,
                id: queryResult.id,
                isBase: queryResult.isBase,
                ticker: queryResult.ticker,
            } : null;
        };

        // Start parsing query language.
        const expression = jsonata(query);
        const tokensAST = TxnQueryASTCalculator.flattenASTTokens(expression.ast());
        const isTokenInExpr = (token: string) => tokensAST.some(t => t.name === token || t.value === token);
        const tokensPresence = {
            delta: ["DELTA", "DELTA_NEG", "DELTA_POS", "changeInValue"].some(x => isTokenInExpr(x)),
        };

        let sqlQuery = this.#repository.createQueryBuilder(alias);
        sqlQuery = sqlQuery.where(`${alias}.${nameofT('ownerId')} = :ownerId`, { ownerId: userId });
        sqlQuery = sqlQuery.leftJoinAndSelect(`${alias}.${nameofT('tags')}`, "txn_tag");
        sqlQuery = sqlQuery.leftJoinAndSelect(`${alias}.${nameofT('fragments')}`, "frags");

        const sqlResults = await sqlQuery.orderBy(nameofT('creationDate'), 'ASC').getManyAndCount();

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
                    id: txn.id!,
                    title: txn.title!,
                    creationDate: txn.creationDate!,
                    description: txn.description,
                    fragments: await Promise.all((txn.fragments ?? []).map(async x => (
                    {
                        fromAmount: x.fromAmount,
                        fromContainerId: x.fromContainerId,
                        fromCurrencyId: x.fromCurrencyId,
                        fromCurrency: x.fromCurrencyId ? await findCurrById(x.fromCurrencyId) : null,
                        toAmount: x.toAmount,
                        toContainerId: x.toContainerId,
                        toCurrencyId: x.toCurrencyId,
                        toCurrency: x.toCurrencyId ? await findCurrById(x.toCurrencyId) : null,
                    }))),
                    tagIds: ((txn.tags ?? []) as { id: string }[]).map(x => x.id) ?? [],
                    tagNames: ((txn.tags ?? []) as { name: string }[]).map(x => x.name) ?? [],
                    changeInValue: null as null | number, // Null for ignoring
                    excludedFromIncomesExpenses: txn.excludedFromIncomesExpenses
                };

                const containersCurrencies = TransactionService.getFragmentsContainersCurrenciesIds(objToBeMatched.fragments);

                // Only calculate delta if it is referenced in the query
                if (tokensPresence.delta)
                {
                    objToBeMatched.changeInValue = unwrap(
                        await TransactionService.getTxnIncreaseInValue(userId, objToBeMatched, currencyRateDatumsCache, baseRateCache, currencyListCache)
                    ).increaseInValue.toNumber();
                }

                const ageMs = (now - objToBeMatched.creationDate);
                expression.assign("TITLE", objToBeMatched.title);
                expression.assign("TITLE_LOWER", objToBeMatched.title.toLowerCase());
                expression.assign("TITLE_UPPER", objToBeMatched.title.toUpperCase());
                expression.assign("AGE_MS", ageMs);
                expression.assign("AGE_SEC", ageMs / 1000);
                expression.assign("AGE_MIN", ageMs / 1000 / 60);
                expression.assign("AGE_HOUR", ageMs / 1000 / 60 / 60);
                expression.assign("AGE_DAY", ageMs / 1000 / 60 / 60 / 24);
                if (objToBeMatched.changeInValue !== null)
                {
                    expression.assign("DELTA", objToBeMatched.changeInValue);
                    expression.assign("DELTA_NEG", objToBeMatched.changeInValue * -1);
                    expression.assign("DELTA_POS", objToBeMatched.changeInValue);
                }
                expression.registerFunction("withinInc", (value, minInclusive, maxInclusive) => value >= minInclusive && value <= maxInclusive, "<nnn:b>");
                expression.registerFunction("withinExc", (value, minInclusive, maxInclusive) => value > minInclusive && value < maxInclusive, "<nnn:b>");
                expression.registerFunction("withContainerId", containerId => containersCurrencies.containersSet.has(containerId), "<s:b>");
                expression.registerFunction("withCurrencyId", currencyId => containersCurrencies.currenciesSet.has(currencyId), "<s:b>");

                // TODO: withTicker is extremely slow uncached
                expression.registerFunction("withTicker", async ticker =>
                {
                    const currWithTicker = await findCurrByTicker(ticker);
                    if (!currWithTicker) return false;
                    return containersCurrencies.currenciesSet.has(currWithTicker.id);
                }, "<s:b>");

                if (await expression.evaluate(objToBeMatched) === true)
                    matchedResults.push(objToBeMatched);
            }
            catch(e) { return new JSONQueryError(userId, `${e.message}`, query); }
        }

        // Since delta is not calculated in the last loop, we need to calculate the delta of transactions that are sent to the clients.
        // otherwise the returned transactions will all be delta=0.
        const inViewRangeResults = matchedResults.slice
        (
            startIndex ?? 0,
            endIndex === null ? matchedResults.length + 1 : endIndex + 1
        );

        const valueHydratedResults = await Promise.all(inViewRangeResults.map(async txn => {
            return {
                ...txn,
                changeInValue: unwrap(
                    await TransactionService.getTxnIncreaseInValue(userId, txn, currencyRateDatumsCache, baseRateCache, currencyListCache)
                ).increaseInValue.toNumber()
            }
        }));

        return {
            totalItems: valueHydratedResults.length,
            rangeItems: valueHydratedResults
        };
    }

    /**
     * This function performs MINIMAL validation logics.
     */
    public async createTransaction
    (
        userId: string,
        obj:
        {
            title: string,
            creationDate: number,
            description: string,
            fragments: FragmentRaw[],
            txnTagIds: string[],
            excludedFromIncomesExpenses: boolean
        },
        queryRunner: QueryRunner,
    )
    {
        // Get all txn tags
        const tags: TxnTag[] = [];
        for (const tagId of obj.txnTagIds)
        {
            const tag = await queryRunner.manager.getRepository(TxnTag).findOne({where: { ownerId: userId, id: tagId }});
            if (tag === null) return new TxnTagNotFoundError({ id: tagId }, userId);
            tags.push(tag);
        }

        const savedObj = await queryRunner.manager.getRepository(Transaction).save(
        {
            ownerId: userId,
            creationDate: obj.creationDate,
            description: obj.description,
            fragments: obj.fragments,
            tags: tags,
            title: obj.title,
            excludedFromIncomesExpenses: obj.excludedFromIncomesExpenses
        });

        if (!savedObj.id)
            throw panic(`Saved rows in the database still got falsy IDs`);

        const savedFragments = await this.saveFragmentsOfTxn(userId, {
            ...obj,
            parentTxnId: savedObj.id!
        }, queryRunner);

        // Id will always be defined since we saved the obj.
        return {
            creationDate: savedObj.creationDate,
            description: savedObj.description,
            fragments: savedFragments,
            id: savedObj.id,
            ownerId: savedObj.ownerId,
            tags: savedObj.tags,
            title: savedObj.title,
            excludedFromIncomesExpenses: savedObj.excludedFromIncomesExpenses
        };
    }

    public async saveFragmentsOfTxn(
        userId: string,
        obj:
        {
            fragments: FragmentRaw[],
            parentTxnId: string
        },
        queryRunner: QueryRunner,
    )
    {
        // Save all fragments
        const savedFragments: Fragment[] = [];
        for (const fragment of obj.fragments)
        {
            const savedFragment = await queryRunner.manager.getRepository(Fragment).save(
            {
                fromAmount: fragment.fromAmount,
                fromContainerId: fragment.fromContainerId,
                fromCurrencyId: fragment.fromCurrencyId,
                toAmount: fragment.toAmount,
                toContainerId: fragment.toContainerId,
                toCurrencyId: fragment.toCurrencyId,
                parentTxnId: obj.parentTxnId,
                ownerId: userId
            });
            savedFragments.push(savedFragment);
        }
        return savedFragments;
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
        sqlQuery = sqlQuery.leftJoinAndSelect(`${alias}.${nameofT('tags')}`, "txn_tag");
        sqlQuery = sqlQuery.leftJoinAndSelect(`${alias}.${nameofT('fragments')}`, "frags");
        sqlQuery = sqlQuery.orderBy(`${alias}.${nameofT('creationDate')}`, "DESC");
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
                id: x.id,
                ownerId: x.ownerId,
                tagIds: (x.tags as { id: string }[]).map(x => x.id) ?? [],
                fragments: (x.fragments as (FragmentRaw & {id: string})[]).map(f => ({
                    id: f.id,
                    fromAmount: f.fromAmount,
                    fromContainerId: f.fromContainerId,
                    fromCurrencyId: f.fromCurrencyId,
                    toAmount: f.toAmount,
                    toContainerId: f.toContainerId,
                    toCurrencyId: f.toCurrencyId,
                })),
                excludedFromIncomesExpenses: x.excludedFromIncomesExpenses
            })),
        };
    }

    public async getUserEarliestTransaction(userId: string)
    {
        let query = await this.#repository
        .createQueryBuilder(`txn`)
        .where(`${nameofT('ownerId')} = :ownerId`, { ownerId: userId ?? null })
        .orderBy(`txn.${nameofT('creationDate')}`, "ASC")
        .limit(1)
        .getOne();

        // Keep interface explicit
        return query === null ? null : {
            id: query.id,
            title: query.title,
            description: query.description,
            ownerId: query.ownerId,
            creationDate: query.creationDate,
            excludedFromIncomesExpenses: query.excludedFromIncomesExpenses
        };
    }

    public async getContainersTransactions(userId: string, containerIds: string[] | { id: string }[])
    {
        const alias = "txn";
        const targetContainerIds = ServiceUtils.normalizeEntitiesToIds(containerIds, 'id');

        let queryResult = await this.#repository
        .createQueryBuilder(alias)
        .where(`${alias}.${nameofT('ownerId')} = :ownerId`, { ownerId: userId ?? null })
        .leftJoinAndSelect(`${alias}.${nameofT('fragments')}`, "frags")
        .andWhere
        (
            /*sql*/`
                frags.${nameofF('fromContainerId')} IN (:...targetContainerIds)
                    OR
                frags.${nameofF('toContainerId')} IN (:...targetContainerIds)`,
            { targetContainerIds: targetContainerIds }
        ).getMany();

        // Be explicit
        return queryResult.map(x => ({
            id: x.id,
            title: x.title,
            description: x.description,
            ownerId: x.ownerId,
            creationDate: x.creationDate,
            fragments: x.fragments.map(f => ({
                id: f.id,
                parentTxnId: f.parentTxnId,
                fromAmount: f.fromAmount,
                fromCurrencyId: f.fromCurrencyId,
                fromContainerId: f.fromContainerId,
                toAmount: f.toAmount,
                toCurrencyId: f.toCurrencyId,
                toContainerId: f.toContainerId,
                ownerId: f.ownerId
            }))
        }))
    }
}