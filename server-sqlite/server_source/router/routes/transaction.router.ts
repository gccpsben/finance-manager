import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { TransactionService } from '../../db/services/transaction.service.js';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
import { Transaction } from '../../db/entities/transaction.entity.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../logics/pagination.js';
import type { PostTransactionDTO, ResponseGetTransactionsDTO, ResponsePostTransactionDTO } from '../../../../api-types/txn.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import type { SQLitePrimitiveOnly } from '../../index.d.js';

const router = new TypesafeRouter(express.Router());

router.post<ResponsePostTransactionDTO>("/api/v1/transactions", 
{
    handler: async (req: express.Request, res: express.Express) => 
    {
        class body implements PostTransactionDTO
        { 
            @IsString() @IsNotEmpty() title: string; 
            @IsOptional() @IsDateString() creationDate?: string | undefined;
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
            creationDate: parsedBody.creationDate ? new Date(parsedBody.creationDate) : new Date(),
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

router.get<ResponseGetTransactionsDTO>(`/api/v1/transactions`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class query extends OptionalPaginationAPIQueryRequest 
        {
            @IsOptional() @IsString() title: string;
            @IsOptional() @IsString() id: string;
        }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const userQuery = 
        {
            start: parsedQuery.start ? parseInt(parsedQuery.start) : undefined,
            end: parsedQuery.end ? parseInt(parsedQuery.end) : undefined,
            title: parsedQuery.title,
            id: parsedQuery.id
        };

        const response: PaginationAPIResponseClass<SQLitePrimitiveOnly<Transaction>> = await (async () => 
        {
            const allTxns = await TransactionService.getTransactions(authResult.ownerUserId, 
            {
                startIndex: userQuery.start,
                endIndex: userQuery.end,
                id: userQuery.id,
                title: userQuery.title
            });

            const output = new PaginationAPIResponseClass<SQLitePrimitiveOnly<Transaction>>();
            output.startingIndex = userQuery.start;
            output.endingIndex = userQuery.start + allTxns.rangeItems.length;
            output.rangeItems = allTxns.rangeItems;
            output.totalItems = allTxns.totalCount;
            return output;
        })();

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
                creationDate: item.creationDate.toISOString(),
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