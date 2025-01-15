import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import Express from 'express';
import { type PutTxnAPI, type GetTxnAPI, type PostTxnAPI, type DeleteTxnAPI, GetTxnJsonQueryAPI } from '../../../../api-types/txn.js';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { JSONQueryError, TransactionService, FragmentMissingContainerOrCurrency, FragmentMissingFromToAmountError, TxnNotFoundError, TxnNoFragmentsError } from '../../db/services/transaction.service.js';
import { IsDecimalJSString, IsIntString, IsUTCDateInt } from '../../db/validators.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../pagination.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import { ExpressValidations } from '../validation.js';
import createHttpError from 'http-errors';
import { UserNotFoundError } from '../../db/services/user.service.js';
import { TxnTagNotFoundError } from '../../db/services/txnTag.service.js';
import { ContainerNotFoundError } from '../../db/services/container.service.js';
import { Database } from '../../db/db.js';
import { Type } from 'class-transformer';
import { unwrap } from '../../std_errors/monadError.js';
import { GlobalCurrencyToBaseRateCache } from '../../db/caches/currencyToBaseRate.cache.js';
import { CurrencyNotFoundError } from '../../db/services/currency.service.js';
import { GlobalCurrencyCache } from '../../db/caches/currencyListCache.cache.js';
import { GlobalCurrencyRateDatumsCache } from '../../db/caches/currencyRateDatumsCache.cache.js';
import { FileNotFoundError } from '../../db/services/files.service.js';

const router = new TypesafeRouter(Express.Router());

router.post<PostTxnAPI.ResponseDTO>("/api/v1/transactions",
{
    handler: async (req: Express.Request, res: Express.Response) =>
    {
        let transactionalContext: null | Awaited<ReturnType<typeof Database.createTransactionalContext>> = null;
        try
        {
            class fragmentItem implements PostTxnAPI.FragmentDTO
            {
                @IsOptional() @IsDecimalJSString() fromAmount: string | null;
                @IsOptional() @IsString() fromCurrency: string | null;
                @IsOptional() @IsString() fromContainer: string | null;
                @IsOptional() @IsDecimalJSString() toAmount: string | null;
                @IsOptional() @IsString() toCurrency: string | null;
                @IsOptional() @IsString() toContainer: string | null;
            }

            class bodyItem implements PostTxnAPI.RequestItemDTO
            {
                @IsString() @IsNotEmpty() title: string;
                @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
                @IsOptional() @IsString() description?: string | undefined;
                @IsArray() @IsNotEmpty() tagIds: string[];
                @IsArray() @IsNotEmpty() fileIds: string[];
                @IsNotEmpty() @IsBoolean() excludedFromIncomesExpenses: boolean;

                @IsArray()
                @ValidateNested({ each: true })
                @Type(() => fragmentItem)
                fragments: PostTxnAPI.FragmentDTO[];
            }

            class body implements PostTxnAPI.RequestDTO
            {
                @IsArray()
                @ValidateNested({ each: true })
                @Type(() => bodyItem)
                transactions: bodyItem[];
            }

            // Check for auth
            const now = Date.now();
            const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
            if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

            transactionalContext = await Database.createTransactionalContext();

            const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
            const idsCreated: string[] = [];

            for (const item of parsedBody.transactions)
            {
                let transactionCreated = await TransactionService.createTransaction(authResult.ownerUserId,
                {
                    creationDate: item.creationDate ? item.creationDate : now,
                    title: item.title,
                    description: item.description ?? "",
                    txnTagIds: item.tagIds,
                    fragments: item.fragments.map(f => ({
                        fromAmount: f.fromAmount,
                        fromContainerId: f.fromContainer,
                        fromCurrencyId: f.fromCurrency,
                        toAmount: f.toAmount,
                        toContainerId: f.toContainer,
                        toCurrencyId: f.toCurrency,
                    })),
                    files: item.fileIds,
                    excludedFromIncomesExpenses: item.excludedFromIncomesExpenses
                }, transactionalContext.queryRunner, GlobalCurrencyCache);

                if (transactionCreated instanceof UserNotFoundError) throw createHttpError(401);
                if (transactionCreated instanceof TxnTagNotFoundError)  throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof ContainerNotFoundError) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof FragmentMissingFromToAmountError) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof FragmentMissingContainerOrCurrency) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof CurrencyNotFoundError) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof TxnNoFragmentsError) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof FileNotFoundError) throw createHttpError(400, transactionCreated.message);

                idsCreated.push(transactionCreated.id);
            }

            await transactionalContext.endSuccess();
            return { id: idsCreated };
        }
        catch(e)
        {
            // Rollback transaction on any error
            await transactionalContext?.endFailure();
            throw e;
        }
    }
});

router.put<PutTxnAPI.ResponseDTO>("/api/v1/transactions",
{
    handler: async (req: Express.Request, res: Express.Response) =>
    {
        let transactionalContext: null | Awaited<ReturnType<typeof Database.createTransactionalContext>> = null;
        try
        {
            class fragmentItem implements PostTxnAPI.FragmentDTO
            {
                @IsOptional() @IsDecimalJSString() fromAmount: string | null;
                @IsOptional() @IsString() fromCurrency: string | null;
                @IsOptional() @IsString() fromContainer: string | null;
                @IsOptional() @IsDecimalJSString() toAmount: string | null;
                @IsOptional() @IsString() toCurrency: string | null;
                @IsOptional() @IsString() toContainer: string | null;
            }

            class body implements PutTxnAPI.RequestBodyDTO
            {
                @IsArray()
                @ValidateNested({ each: true })
                @Type(() => fragmentItem)
                fragments: PutTxnAPI.FragmentDTO[];

                @IsString() @IsNotEmpty() title: string;
                @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
                @IsOptional() @IsString() description?: string | undefined;
                @IsArray() @IsNotEmpty() tagIds: string[];
                @IsArray() @IsNotEmpty() fileIds: string[];
                @IsNotEmpty() @IsBoolean() excludedFromIncomesExpenses: boolean;
            }

            class query implements PutTxnAPI.RequestQueryDTO
            {
                @IsString() @IsNotEmpty() targetTxnId: string;
            }

            const now = Date.now();
            const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
            if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
            const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
            const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);

            transactionalContext = await Database.createTransactionalContext();

            const updatedTxn = await TransactionService.updateTransaction(authResult.ownerUserId, parsedQuery.targetTxnId,
            {
                creationDate: parsedBody.creationDate ? parsedBody.creationDate : now,
                title: parsedBody.title,
                description: parsedBody.description ?? "",
                txnTagIds: parsedBody.tagIds,
                fragments: parsedBody.fragments.map(f => ({
                    fromAmount: f.fromAmount,
                    fromContainerId: f.fromContainer,
                    fromCurrencyId: f.fromCurrency,
                    toAmount: f.toAmount,
                    toContainerId: f.toContainer,
                    toCurrencyId: f.toCurrency
                })),
                excludedFromIncomesExpenses: parsedBody.excludedFromIncomesExpenses,
                files: parsedBody.fileIds
            }, transactionalContext.queryRunner, GlobalCurrencyCache);

            if (updatedTxn instanceof UserNotFoundError) throw createHttpError(401);
            if (updatedTxn instanceof TxnNotFoundError) throw createHttpError(404);
            if (updatedTxn instanceof TxnTagNotFoundError) throw createHttpError(400, updatedTxn.message);
            if (updatedTxn instanceof ContainerNotFoundError) throw createHttpError(400, updatedTxn.message);
            if (updatedTxn instanceof FragmentMissingFromToAmountError) throw createHttpError(400, updatedTxn.message);
            if (updatedTxn instanceof FragmentMissingContainerOrCurrency) throw createHttpError(400, updatedTxn.message);
            if (updatedTxn instanceof FileNotFoundError) throw createHttpError(400, updatedTxn.message);

            await transactionalContext.endSuccess();
            return {};
        }
        catch(e)
        {
            // Rollback transaction on any error
            await transactionalContext?.endFailure();
            throw e;
        }
    }
});

router.get<GetTxnAPI.ResponseDTO>(`/api/v1/transactions/json-query`,
{
    handler: async (req: Express.Request, res: Express.Response) =>
    {
        class query implements GetTxnJsonQueryAPI.QueryDTO
        {
            @IsNotEmpty() @IsString() query: string;
            @IsOptional() @IsIntString() startIndex: string | undefined;
            @IsOptional() @IsIntString() endIndex: string | undefined;
        }

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const userQuery =
        {
            query: parsedQuery.query,
            startIndex: parsedQuery.startIndex === undefined ? null : parseInt(parsedQuery.startIndex),
            endIndex: parsedQuery.endIndex === undefined ? null : parseInt(parsedQuery.endIndex)
        };

        const matchedResults = await Database.getTransactionRepository()!.getTransactionsJSONQuery
        (
            authResult.ownerUserId,
            parsedQuery.query,
            GlobalCurrencyRateDatumsCache,
            GlobalCurrencyToBaseRateCache,
            GlobalCurrencyCache,
            userQuery.startIndex,
            userQuery.endIndex,
        );

        if (matchedResults instanceof JSONQueryError) throw createHttpError(400, matchedResults.message);

        const rangeItemsWithValue = await (async () =>
        {
            const results = [];
            for (const item of matchedResults.rangeItems)
            {
                const txnChangeInValue = unwrap(
                    await TransactionService.getTxnIncreaseInValue(
                        authResult.ownerUserId,
                        item,
                        GlobalCurrencyRateDatumsCache,
                        GlobalCurrencyToBaseRateCache,
                        GlobalCurrencyCache
                    )
                ).increaseInValue;
                results.push(
                {
                    id: item.id!,
                    title: item.title,
                    description: item.description ?? '',
                    owner: authResult.ownerUserId,
                    creationDate: item.creationDate,
                    tagIds: item.tagIds,
                    fragments: item.fragments,
                    changeInValue: txnChangeInValue.toString(),
                    excludedFromIncomesExpenses: item.excludedFromIncomesExpenses,
                    fileIds: item.fileIds
                });
            }
            return results;
        })();

        return {
            endingIndex: Math.min(matchedResults.totalItems, userQuery.endIndex === null ? Number.POSITIVE_INFINITY : userQuery.endIndex),
            startingIndex: Math.min(matchedResults.totalItems, userQuery.startIndex === null ? Number.POSITIVE_INFINITY : userQuery.startIndex),
            rangeItems: rangeItemsWithValue.map(item => (
            {
                creationDate: item.creationDate,
                description: item.description,
                fragments: item.fragments.map(frag => (
                {
                    fromAmount: frag.fromAmount,
                    fromContainer: frag.fromContainerId,
                    fromCurrency: frag.fromCurrencyId,
                    toAmount: frag.toAmount,
                    toContainer: frag.toContainerId,
                    toCurrency: frag.toCurrencyId
                } satisfies GetTxnAPI.FragmentDTO)),
                id: item.id,
                owner: item.owner,
                tagIds: item.tagIds,
                title: item.title,
                changeInValue: item.changeInValue,
                excludedFromIncomesExpenses: item.excludedFromIncomesExpenses,
                fileIds: item.fileIds
            })),
            totalItems: matchedResults.totalItems
        } satisfies GetTxnJsonQueryAPI.ResponseDTO
    }
});

router.get<GetTxnAPI.ResponseDTO>(`/api/v1/transactions`,
{
    handler: async (req: Express.Request, res: Express.Response) =>
    {
        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsString() title: string;
            @IsOptional() @IsString() id: string;
            @IsOptional() @IsIntString() startDate?: string | undefined;
            @IsOptional() @IsIntString() endDate?: string | undefined;
        }

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const userQuery =
        {
            start: parsedQuery.start ? parseInt(parsedQuery.start) : undefined,
            end: parsedQuery.end ? parseInt(parsedQuery.end) : undefined,
            title: parsedQuery.title,
            id: parsedQuery.id,
            startEpoch: parsedQuery.startDate ? parseInt(parsedQuery.startDate) : undefined,
            endEpoch: parsedQuery.endDate ? parseInt(parsedQuery.endDate) : undefined,
        };

        const response = await PaginationAPIResponseClass.prepareFromQueryItems
        (
            await Database.getTransactionRepository()!.getTransactions(authResult.ownerUserId,
            {
                startIndex: userQuery.start,
                endIndex: userQuery.end,
                id: userQuery.id,
                title: userQuery.title,
                startDate: userQuery.startEpoch,
                endDate: userQuery.endEpoch
            }),
            userQuery.start
        );

        // Do not use Promise.all here, since cache will not be used until Promise.all is resolved.
        const rangeItems = await (async () =>
        {
            const result = [];
            for (const item of response.rangeItems)
            {
                const txnChangeInValue = unwrap(
                    await TransactionService.getTxnIncreaseInValue(
                        authResult.ownerUserId,
                        item,
                        GlobalCurrencyRateDatumsCache,
                        GlobalCurrencyToBaseRateCache,
                        GlobalCurrencyCache
                    )
                ).increaseInValue;
                result.push(
                {
                    id: item.id!,
                    title: item.title,
                    description: item.description ?? '',
                    owner: item.ownerId,
                    creationDate: item.creationDate,
                    tagIds: item.tagIds,
                    fragments: item.fragments,
                    changeInValue: txnChangeInValue.toString(),
                    excludedFromIncomesExpenses: item.excludedFromIncomesExpenses,
                    fileIds: item.files
                });
            }
            return result;
        })();

        return {
            totalItems: response.totalItems,
            endingIndex: response.endingIndex,
            startingIndex: response.startingIndex,
            rangeItems: rangeItems.map(item =>
            {
                const output: GetTxnAPI.TxnDTO =
                {
                    creationDate: item.creationDate,
                    description: item.description,
                    fragments: item.fragments.map(frag => (
                    {
                        fromAmount: frag.fromAmount,
                        fromContainer: frag.fromContainerId,
                        fromCurrency: frag.fromCurrencyId,
                        toAmount: frag.toAmount,
                        toContainer: frag.toContainerId,
                        toCurrency: frag.toCurrencyId
                    })),
                    id: item.id,
                    owner: item.owner,
                    tagIds: item.tagIds,
                    title: item.title,
                    changeInValue: item.changeInValue,
                    excludedFromIncomesExpenses: item.excludedFromIncomesExpenses,
                    fileIds: item.fileIds
                };
                return output;
            })
        };
    }
});

router.delete<DeleteTxnAPI.ResponseDTO>(`/api/v1/transactions`,
{
    handler: async (req: Express.Request, res: Express.Response) =>
    {
        let transactionalContext: null | Awaited<ReturnType<typeof Database.createTransactionalContext>> = null;
        try
        {
            class query implements DeleteTxnAPI.RequestQueryDTO
            {
                @IsNotEmpty() @IsString() id: string;
            }

            const now = Date.now();
            const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
            if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

            const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
            transactionalContext = await Database.createTransactionalContext();

            const deleteResult = await Database.getTransactionRepository()!.deleteTransactions([parsedQuery.id], transactionalContext.queryRunner);
            if (deleteResult.affected === 0) throw createHttpError(404);
            await transactionalContext.endSuccess();
            return {};
        }
        catch(e)
        {
            await transactionalContext?.endFailure();
            throw e;
        }
    }
});

export default router.getRouter();