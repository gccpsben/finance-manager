import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import express from 'express';
import type { GetTxnAPI, PostTxnAPI } from '../../../../api-types/txn.js';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { TransactionService } from '../../db/services/transaction.service.js';
import { IsDecimalJSString, IsIntString, IsUTCDateInt } from '../../db/validators.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../logics/pagination.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import { ExpressValidations } from '../validation.js';

const router = new TypesafeRouter(express.Router());

router.post<PostTxnAPI.ResponseDTO>("/api/v1/transactions", 
{
    handler: async (req: express.Request, res: express.Express) => 
    {
        class body implements PostTxnAPI.RequestDTO
        { 
            @IsString() @IsNotEmpty() title: string; 
            @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
            @IsOptional() @IsString() description?: string | undefined;
            @IsString() @IsNotEmpty() typeId: string;
            @IsOptional() @IsDecimalJSString() fromAmount: string | undefined;
            @IsOptional() @IsString() fromContainerId: string | undefined;
            @IsOptional() @IsString() fromCurrencyId: string | undefined;
            @IsOptional() @IsDecimalJSString() toAmount: string | undefined;
            @IsOptional() @IsString() toContainerId: string | undefined;
            @IsOptional() @IsString() toCurrencyId: string | undefined;
        }
    
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const transactionCreated = await TransactionService.createTransaction(authResult.ownerUserId, 
        {
            creationDate: parsedBody.creationDate ? parsedBody.creationDate : Date.now(),
            title: parsedBody.title,
            description: parsedBody.description,
            typeId: parsedBody.typeId,
            fromAmount: parsedBody.fromAmount,
            fromContainerId: parsedBody.fromContainerId,
            fromCurrencyId: parsedBody.fromCurrencyId,
            toAmount: parsedBody.toAmount,
            toContainerId: parsedBody.toContainerId,
            toCurrencyId: parsedBody.toCurrencyId
        });
        
        return { id: transactionCreated.id };
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

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
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
                id: item.id,
                title: item.title,
                description: item.description,
                owner: item.ownerId,
                creationDate: item.creationDate,
                txnType: item.txnTypeId,
                fromAmount: item.fromAmount,
                fromCurrency: item.fromCurrencyId,
                fromContainer: item.fromContainerId,
                toAmount: item.toAmount,
                toCurrency: item.toCurrencyId,
                toContainer: item.toContainerId
            }))
        };
    }
});

export default router.getRouter();