import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { CurrencyService } from '../../db/services/currency.service.js';
import { Decimal } from 'decimal.js';
import { IsNumber, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString, IsIntString } from '../../db/validators.js';
import createHttpError from 'http-errors';
import { RateHydratedCurrency } from '../../db/entities/currency.entity.js';
import type { GetCurrencyAPI, GetCurrencyRateHistoryAPI, PostCurrencyAPI } from "../../../../api-types/currencies.js";
import { TypesafeRouter } from '../typescriptRouter.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../logics/pagination.js';
import { CurrencyRateDatumService } from '../../db/services/currencyRateDatum.service.js';
import { unwrap } from '../../stdErrors/monadError.js';

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

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
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

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
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

router.get<GetCurrencyRateHistoryAPI.ResponseDTO>(`/api/v1/currencies/history`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class query implements GetCurrencyRateHistoryAPI.RequestQueryDTO
        {
            @IsString() id: string;
            @IsOptional() @IsIntString() division: string;
            @IsOptional() @IsIntString() startDate?: string;
            @IsOptional() @IsIntString() endDate?: string;
        }

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const datums = unwrap(await CurrencyRateDatumService.getCurrencyRateHistory
        (
            authResult.ownerUserId,
            parsedQuery.id,
            parsedQuery.startDate ? new Date(parseInt(parsedQuery.startDate)) : undefined,
            parsedQuery.endDate ? new Date(parseInt(parsedQuery.endDate)) : undefined,
            parsedQuery.division ? parseInt(parsedQuery.division) : 128
        ));

        return {
            datums: datums.datums.map(x => ({ date: x.date, value: x.rateToBase.toString() })),
            endDate: datums.latestDatum?.date,
            startDate: datums.earliestDatum?.date,
            historyAvailable: datums.datums.length >= 2
        };
    }
})

export default router.getRouter();