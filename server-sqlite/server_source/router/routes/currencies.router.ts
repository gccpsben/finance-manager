import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { CurrencyService } from '../../db/services/currency.service.js';
import { Decimal } from 'decimal.js';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
import createHttpError from 'http-errors';
import { RateHydratedCurrency } from '../../db/entities/currency.entity.js';
import type { GetCurrencyAPI, PostCurrencyAPI } from "../../../../api-types/currencies.js";
import { TypesafeRouter } from '../typescriptRouter.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../logics/pagination.js';

const router = new TypesafeRouter(express.Router());

router.post<PostCurrencyAPI.ResponseDTO>(`/api/v1/currencies`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class body implements PostCurrencyAPI.RequestDTO
        {
            @IsString() name: string; 
            @IsOptional() @IsString() @IsDecimalJSString() fallbackRateAmount: string | undefined;
            @IsOptional() @IsString() fallbackRateCurrencyId: string | undefined;
            @IsString() ticker: string;
        }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const newCurrency = await CurrencyService.createCurrency
        (
            authResult.ownerUserId, 
            parsedBody.name,
            parsedBody.fallbackRateAmount ? new Decimal(parsedBody.fallbackRateAmount) : undefined, 
            parsedBody.fallbackRateCurrencyId,
            parsedBody.ticker
        );
        return { id: newCurrency.id }
    }
});

router.get<GetCurrencyAPI.ResponseDTO>(`/api/v1/currencies`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsString() name: string; 
            @IsOptional() @IsString() id: string;
            /** Which date should the rate of this currency be calculated against */
            @IsOptional() @IsNumberString() date: string;
        }

        const domainToDTO = (curr: RateHydratedCurrency) => (
        {
            amount: curr.currency.fallbackRateAmount,
            id: curr.currency.id,
            isBase: curr.currency.isBase,
            name: curr.currency.name,
            owner: curr.currency.owner.id,
            rateToBase: curr.rateToBase,
            refCurrency: curr.currency.fallbackRateCurrency?.id,
            ticker: curr.currency.ticker
        });

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);

        if (parsedQuery.id && parsedQuery.name) 
            throw createHttpError(400, `Name and ID cannot be both provided at the same time.`);

        const userQuery = 
        {
            start: parsedQuery.start ? parseInt(parsedQuery.start) : undefined,
            end: parsedQuery.end ? parseInt(parsedQuery.end) : undefined,
            name: parsedQuery.name,
            id: parsedQuery.id,
            requestedRateDate: parsedQuery.date === undefined ? Date.now() : parseInt(parsedQuery.date)
        };
    
        const sqlPrimitiveCurrencies = await PaginationAPIResponseClass.prepareFromQueryItems
        (
            await CurrencyService.getManyCurrencies(authResult.ownerUserId, 
            {
                startIndex: userQuery.start,
                endIndex: userQuery.end,
                id: userQuery.id,
                name: userQuery.name
            }),
            userQuery.start
        );

        return {
            ...sqlPrimitiveCurrencies,
            rangeItems: await (async () => 
            {
                const rateHydratedCurrencies = await CurrencyService.rateHydrateCurrency
                (
                    authResult.ownerUserId, 
                    sqlPrimitiveCurrencies.rangeItems,
                    userQuery.requestedRateDate
                );
                return rateHydratedCurrencies.map(c => (
                {
                    fallbackRateAmount: c.currency.fallbackRateAmount,
                    id: c.currency.id,
                    isBase: c.currency.isBase,
                    name: c.currency.name,
                    owner: c.currency.ownerId,
                    rateToBase: c.rateToBase,
                    fallbackRateCurrencyId: c.currency.fallbackRateCurrencyId,
                    ticker: c.currency.ticker
                }));
            })()
        }
    }
});

export default router.getRouter();