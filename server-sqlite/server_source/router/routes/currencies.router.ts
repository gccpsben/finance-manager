import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { CurrencyCalculator, CurrencyService } from '../../db/services/currency.service.js';
import { Decimal } from 'decimal.js';
import { IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
import createHttpError from 'http-errors';
import { Currency } from '../../db/entities/currency.entity.js';
import type { GetCurrencyDTO, PostCurrencyDTO, ResponseGetCurrencyDTO, ResponsePostCurrencyDTO } from "../../../../api-types/currencies.js";
import { TypesafeRouter } from '../typescriptRouter.js';

const router = new TypesafeRouter(express.Router());

router.post<ResponsePostCurrencyDTO>(`/api/v1/currencies`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class body implements PostCurrencyDTO
        {
            @IsString() name: string; 
            @IsOptional() @IsString() @IsDecimalJSString() amount: string | undefined;
            @IsOptional() @IsString() refCurrencyId: string | undefined;
            @IsString() ticker: string;
        }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const newCurrency = await CurrencyService.createCurrency
        (
            authResult.ownerUserId, 
            parsedBody.name,
            parsedBody.amount ? new Decimal(parsedBody.amount) : undefined, 
            parsedBody.refCurrencyId,
            parsedBody.ticker
        );
        return { id: newCurrency.id }
    }
});

router.get<ResponseGetCurrencyDTO>(`/api/v1/currencies`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class query
        {
            @IsOptional() @IsString() name: string; 
            @IsOptional() @IsString() id: string;
        }

        const domainToDTO = (curr: Currency & { rateToBase?: string }) => (
        {
            amount: curr.amount,
            id: curr.id,
            isBase: curr.isBase,
            name: curr.name,
            owner: curr.owner.id,
            rateToBase: curr.rateToBase,
            refCurrency: curr.refCurrency?.id,
            ticker: curr.ticker
        });
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        
        if (parsedBody.id && parsedBody.name) 
            throw createHttpError(400, `Name and ID cannot be both provided at the same time.`);
    
        // Return all currencies if no query is given
        if (!parsedBody.id && !parsedBody.name)
        {
            let output: (Currency & { rateToBase?: string })[] = await CurrencyService.getUserCurrencies(authResult.ownerUserId);
            for (const currency of output)
                currency.rateToBase = (await CurrencyCalculator.currencyToBaseRate(authResult.ownerUserId, currency)).toString();
            return output.map(domainToDTO);
        }
        else
        {
            const currencyFound = await CurrencyService.getCurrency(authResult.ownerUserId, {
                name: parsedBody.name,
                id: parsedBody.id
            });
            const hydratedCurrency: Currency & { rateToBase?: string } = currencyFound;
            hydratedCurrency.rateToBase = (await CurrencyCalculator.currencyToBaseRate(authResult.ownerUserId, currencyFound)).toString();
            return [domainToDTO(hydratedCurrency)];
        }
    }
});

export default router.getRouter();