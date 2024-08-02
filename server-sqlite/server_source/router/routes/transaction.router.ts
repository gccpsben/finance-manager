import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { TransactionService } from '../../db/services/transaction.service.js';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
const router = express.Router();

router.post("/api/v1/transactions", async (req: express.Request, res: express.Response, next: NextFunction) => 
{
    try
    {
        class body
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
        res.json(transactionCreated);
    }
    catch(e) { next(e); }
});

export default router;