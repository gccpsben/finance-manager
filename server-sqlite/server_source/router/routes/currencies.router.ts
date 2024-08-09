import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { CurrencyService } from '../../db/services/currency.service.js';
import { Decimal } from 'decimal.js';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
import createHttpError from 'http-errors';
import { RateHydratedCurrency } from '../../db/entities/currency.entity.js';
import type { PostCurrencyDTO, ResponseGetCurrencyDTO, ResponsePostCurrencyDTO } from "../../../../api-types/currencies.js";
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
            /** Which date should the rate of this currency be calculated against */
            @IsOptional() @IsNumberString() date: string;
        }

        const domainToDTO = (curr: RateHydratedCurrency) => (
        {
            amount: curr.currency.amount,
            id: curr.currency.id,
            isBase: curr.currency.isBase,
            name: curr.currency.name,
            owner: curr.currency.owner.id,
            rateToBase: curr.rateToBase,
            refCurrency: curr.currency.refCurrency?.id,
            ticker: curr.currency.ticker
        });
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const requestedRateDate = parsedBody.date === undefined ? Date.now() : parseInt(parsedBody.date);
        
        if (parsedBody.id && parsedBody.name) 
            throw createHttpError(400, `Name and ID cannot be both provided at the same time.`);
    
        // Return all currencies if no query is given
        if (!parsedBody.id && !parsedBody.name)
        {
            let userCurrencies = await CurrencyService.getUserCurrencies(authResult.ownerUserId);
            let output: Partial<RateHydratedCurrency>[] = [];
            for (const currency of userCurrencies)
                output.push(await CurrencyService.rateHydrateCurrency(authResult.ownerUserId, currency, requestedRateDate));
            return output.map(domainToDTO);
        }
        else
        {
            const currencyFound = await CurrencyService.getCurrency(authResult.ownerUserId, {
                name: parsedBody.name,
                id: parsedBody.id
            });
            const hydratedCurrency: RateHydratedCurrency = await CurrencyService.rateHydrateCurrency(authResult.ownerUserId, currencyFound, requestedRateDate);
            return [domainToDTO(hydratedCurrency)];
        }
    }
});

export default router.getRouter();