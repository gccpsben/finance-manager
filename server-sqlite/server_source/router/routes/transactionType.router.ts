import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { CurrencyService } from '../../db/services/currency.service.js';
import { Decimal } from 'decimal.js';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
import { TransactionTypeService } from '../../db/services/transactionType.service.js';

const router = express.Router();

router.post("/api/v1/transactionTypes", async (req: express.Request, res: express.Response, next: NextFunction) => 
{
    try
    {
        class body { @IsString() @IsNotEmpty() name: string; }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        res.json(await TransactionTypeService.createTransactionType(authResult.ownerUserId, parsedBody.name)); 
    }
    catch(e) { next(e); }
});

export default router;