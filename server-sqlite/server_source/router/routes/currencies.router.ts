import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { CurrencyCalculator, CurrencyService } from '../../db/services/currency.service.js';
import { Decimal } from 'decimal.js';
import { IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
import createHttpError from 'http-errors';
import { Currency } from '../../db/entities/currency.entity.js';
import { type NonFunctionProperties } from '../../index.d.js'

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

router.get("/api/v1/currencies", async (req: express.Request, res: express.Response, next: NextFunction) => 
{
    type endpointResponse = { rateToBase: Decimal; } & NonFunctionProperties<Currency>;
    
    try
    {
        res.json(await (async () => 
        {
            class query
            {
                @IsOptional() @IsString() name: string; 
                @IsOptional() @IsString() id: string;
            }
    
            const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
            const parsedBody = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
            
            if (parsedBody.id && parsedBody.name)
                throw createHttpError(400, `Name and ID cannot be both provided at the same time.`);
            if (!parsedBody.id && !parsedBody.name)
                throw createHttpError(400, `Empty query is not allowed.`);

            const currencyFound = await CurrencyService.getCurrency(authResult.ownerUserId, {
                currencyName: parsedBody.name,
                id: parsedBody.id
            });
    
            return {
                ...currencyFound,
                rateToBase: await CurrencyCalculator.currencyToBaseRate(authResult.ownerUserId, currencyFound)
            }
        })() satisfies endpointResponse);
    }
    catch(e) { next(e); }
});

export default router;