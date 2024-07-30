import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { CurrencyService } from '../../db/services/currency.service.js';
import { Decimal } from 'decimal.js';
import { IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';

const router = express.Router();

router.post("/api/v1/currencies", async (req: express.Request, res: express.Response, next: NextFunction) => 
{
    try
    {
        class body
        {
            @IsString() name: string; 
            @IsOptional() @IsString() @IsDecimalJSString() amount: string;
            @IsOptional() @IsString() refCurrencyId: string;
            @IsString() ticker: string;
        }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        res.json(await CurrencyService.createCurrency(authResult.ownerUserId, 
            parsedBody.name,
            parsedBody.amount ? new Decimal(parsedBody.amount) : undefined, 
            parsedBody.refCurrencyId,
            parsedBody.ticker)
        ); 
    }
    catch(e) { next(e); }
});

export default router;