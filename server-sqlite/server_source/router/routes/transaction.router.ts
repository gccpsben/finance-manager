import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import express from 'express';
import { type PutTxnAPI, type GetTxnAPI, type PostTxnAPI } from '../../../../api-types/txn.js';
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

const router = new TypesafeRouter(express.Router());

router.post<PostTxnAPI.ResponseDTO>("/api/v1/transactions",
{
    handler: async (req: express.Request, res: express.Express) =>
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
        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const queryRunner = Database.AppDataSource!.createQueryRunner();
        queryRunner.startTransaction();
        const endFailure = async () => { queryRunner.rollbackTransaction(); queryRunner.release(); };
        const endSuccess = async () => { queryRunner.commitTransaction(); queryRunner.release(); };

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const idsCreated: string[] = [];

        for (const item of parsedBody.transactions)
        {
            let transactionCreated = await TransactionService.createTransaction(authResult.ownerUserId,
            {
                creationDate: item.creationDate ? item.creationDate : Date.now(),
                title: item.title,
                description: item.description ?? "",
                txnTagIds: item.tagIds,
                fromAmount: item.fromAmount,
                fromContainerId: item.fromContainerId,
                fromCurrencyId: item.fromCurrencyId,
                toAmount: item.toAmount,
                toContainerId: item.toContainerId,
                toCurrencyId: item.toCurrencyId
            }, queryRunner);

            if (transactionCreated instanceof UserNotFoundError) { await endFailure(); throw createHttpError(401) };
            if (transactionCreated instanceof TxnTagNotFoundError) { await endFailure();  throw createHttpError(400, transactionCreated.message); }
            if (transactionCreated instanceof ContainerNotFoundError) { await endFailure(); throw createHttpError(400, transactionCreated.message); }
            if (transactionCreated instanceof TxnMissingFromToAmountError) { await endFailure(); throw createHttpError(400, transactionCreated.message); }
            if (transactionCreated instanceof TxnMissingContainerOrCurrency) { await endFailure(); throw createHttpError(400, transactionCreated.message); }

            idsCreated.push(transactionCreated.id);
        }

        await endSuccess();

        return { id: idsCreated };
    }
});

router.put<PutTxnAPI.ResponseDTO>("/api/v1/transactions",
{
    handler: async (req: express.Request, res: express.Express) =>
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

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);

        const queryRunner = Database.AppDataSource!.createQueryRunner();
        queryRunner.startTransaction();
        const endFailure = async () => { queryRunner.rollbackTransaction(); queryRunner.release(); };
        const endSuccess = async () => { queryRunner.commitTransaction(); queryRunner.release(); };

        const updatedTxn = await TransactionService.updateTransaction(authResult.ownerUserId, parsedQuery.targetTxnId,
        {
            creationDate: parsedBody.creationDate ? parsedBody.creationDate : Date.now(),
            title: parsedBody.title,
            description: parsedBody.description ?? "",
            tagIds: parsedBody.tagIds,
            fromAmount: parsedBody.fromAmount,
            fromContainerId: parsedBody.fromContainerId,
            fromCurrencyId: parsedBody.fromCurrencyId,
            toAmount: parsedBody.toAmount,
            toContainerId: parsedBody.toContainerId,
            toCurrencyId: parsedBody.toCurrencyId
        }, queryRunner);

        if (updatedTxn instanceof UserNotFoundError) { await endFailure(); throw createHttpError(401); }
        if (updatedTxn instanceof TxnNotFoundError) { await endFailure(); throw createHttpError(404); }
        if (updatedTxn instanceof TxnTagNotFoundError) { await endFailure(); throw createHttpError(400, updatedTxn.message); }
        if (updatedTxn instanceof ContainerNotFoundError) { await endFailure(); throw createHttpError(400, updatedTxn.message); }
        if (updatedTxn instanceof TxnMissingFromToAmountError) { await endFailure(); throw createHttpError(400, updatedTxn.message); }
        if (updatedTxn instanceof TxnMissingContainerOrCurrency) { await endFailure(); throw createHttpError(400, updatedTxn.message); }

        await endSuccess();

        return {};
    }
});

router.get<GetTxnAPI.ResponseDTO>(`/api/v1/transactions`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsString() title: string;
            @IsOptional() @IsString() id: string;
            @IsOptional() @IsIntString() startDate?: string | undefined;
            @IsOptional() @IsIntString() endDate?: string | undefined;
        }

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
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
            rangeItems: response.rangeItems.map(item => (
            {
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
                toContainer: item.toContainerId ?? null
            }))
        };
    }
});

export default router.getRouter();