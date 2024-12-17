import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import Express from 'express';
import { type PutTxnAPI, type GetTxnAPI, type PostTxnAPI, type DeleteTxnAPI } from '../../../../api-types/txn.js';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { TransactionService, TxnMissingContainerOrCurrency, TxnMissingFromToAmountError, TxnNotFoundError } from '../../db/services/transaction.service.js';
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

const router = new TypesafeRouter(Express.Router());

router.post<PostTxnAPI.ResponseDTO>("/api/v1/transactions",
{
    handler: async (req: Express.Request, res: Express.Response) =>
    {
        let transactionalContext: null | Awaited<ReturnType<typeof Database.createTransactionalContext>> = null;
        try
        {
            class bodyItem implements PostTxnAPI.RequestItemDTO
            {
                @IsString() @IsNotEmpty() title: string;
                @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
                @IsOptional() @IsString() description?: string | undefined;
                @IsArray() @IsNotEmpty() tagIds: string[];
                @IsOptional() @IsDecimalJSString() fromAmount: string | undefined;
                @IsOptional() @IsString() fromContainerId: string | undefined;
                @IsOptional() @IsString() fromCurrencyId: string | undefined;
                @IsOptional() @IsDecimalJSString() toAmount: string | undefined;
                @IsOptional() @IsString() toContainerId: string | undefined;
                @IsOptional() @IsString() toCurrencyId: string | undefined;
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
                    fromAmount: item.fromAmount,
                    fromContainerId: item.fromContainerId,
                    fromCurrencyId: item.fromCurrencyId,
                    toAmount: item.toAmount,
                    toContainerId: item.toContainerId,
                    toCurrencyId: item.toCurrencyId
                }, transactionalContext.queryRunner);

                if (transactionCreated instanceof UserNotFoundError) throw createHttpError(401);
                if (transactionCreated instanceof TxnTagNotFoundError)  throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof ContainerNotFoundError) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof TxnMissingFromToAmountError) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof TxnMissingContainerOrCurrency) throw createHttpError(400, transactionCreated.message);
                if (transactionCreated instanceof CurrencyNotFoundError) throw createHttpError(400, transactionCreated.message);

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
            class body implements PutTxnAPI.RequestBodyDTO
            {
                @IsString() @IsNotEmpty() title: string;
                @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
                @IsOptional() @IsString() description?: string | undefined;
                @IsArray() @IsNotEmpty() tagIds: string[];
                @IsOptional() @IsDecimalJSString() fromAmount: string | undefined;
                @IsOptional() @IsString() fromContainerId: string | undefined;
                @IsOptional() @IsString() fromCurrencyId: string | undefined;
                @IsOptional() @IsDecimalJSString() toAmount: string | undefined;
                @IsOptional() @IsString() toContainerId: string | undefined;
                @IsOptional() @IsString() toCurrencyId: string | undefined;
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
                tagIds: parsedBody.tagIds,
                fromAmount: parsedBody.fromAmount,
                fromContainerId: parsedBody.fromContainerId,
                fromCurrencyId: parsedBody.fromCurrencyId,
                toAmount: parsedBody.toAmount,
                toContainerId: parsedBody.toContainerId,
                toCurrencyId: parsedBody.toCurrencyId
            }, transactionalContext.queryRunner);

            if (updatedTxn instanceof UserNotFoundError) throw createHttpError(401);
            if (updatedTxn instanceof TxnNotFoundError) throw createHttpError(404);
            if (updatedTxn instanceof TxnTagNotFoundError) throw createHttpError(400, updatedTxn.message);
            if (updatedTxn instanceof ContainerNotFoundError) throw createHttpError(400, updatedTxn.message);
            if (updatedTxn instanceof TxnMissingFromToAmountError) throw createHttpError(400, updatedTxn.message);
            if (updatedTxn instanceof TxnMissingContainerOrCurrency) throw createHttpError(400, updatedTxn.message);

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
            await TransactionService.getTransactions(authResult.ownerUserId,
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

        return {
            totalItems: response.totalItems,
            endingIndex: response.endingIndex,
            startingIndex: response.startingIndex,
            rangeItems: await Promise.all(response.rangeItems.map(async item =>
            {
                const txnChangeInValue = unwrap(await TransactionService.getTxnIncreaseInValue(item.ownerId, item, GlobalCurrencyToBaseRateCache)).increaseInValue;
                return {
                    id: item.id!,
                    title: item.title,
                    description: item.description ?? '',
                    owner: item.ownerId,
                    creationDate: item.creationDate,
                    tagIds: item.tagIds,
                    fromAmount: item.fromAmount ?? null,
                    fromCurrency: item.fromCurrencyId ?? null,
                    fromContainer: item.fromContainerId ?? null,
                    toAmount: item.toAmount ?? null,
                    toCurrency: item.toCurrencyId ?? null,
                    toContainer: item.toContainerId ?? null,
                    changeInValue: txnChangeInValue.toString()
                }
            }))
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

            const deleteResult = await TransactionService.deleteTransactions([parsedQuery.id], transactionalContext.queryRunner);
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