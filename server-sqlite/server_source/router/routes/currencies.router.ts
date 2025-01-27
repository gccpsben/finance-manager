import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.ts';
import { CurrencyNameTakenError, CurrencyNotFoundError, CurrencyRefCurrencyIdAmountTupleError, CurrencyService, CurrencyTickerTakenError } from '../../db/services/currency.service.ts';
import { Decimal } from 'decimal.js';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.ts';
import { IsDecimalJSString, IsIntString } from '../../db/validators.ts';
import createHttpError from 'http-errors';
import type { GetCurrencyAPI, GetCurrencyRateHistoryAPI, PostCurrencyAPI } from "../../../../api-types/currencies.d.ts";
import { TypesafeRouter } from '../typescriptRouter.ts';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../pagination.ts';
import { CurrencyRateDatumService } from '../../db/services/currencyRateDatum.service.ts';
import { unwrap } from '../../std_errors/monadError.ts';
import { UserNotFoundError } from '../../db/services/user.service.ts';
import { Database } from '../../db/db.ts';
import { GlobalCurrencyToBaseRateCache } from '../../db/caches/currencyToBaseRate.cache.ts';
import { GlobalCurrencyCache } from '../../db/caches/currencyListCache.cache.ts';
import { GlobalCurrencyRateDatumsCache } from '../../db/caches/currencyRateDatumsCache.cache.ts';
import { GlobalUserCache } from "../../db/caches/user.cache.ts";

const router = new TypesafeRouter(express.Router());

router.post<PostCurrencyAPI.ResponseDTO>(`/api/v1/currencies`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class body implements PostCurrencyAPI.RequestDTO
        {
            @IsString() name!: string;
            @IsOptional() @IsString() @IsDecimalJSString() fallbackRateAmount!: string | null;
            @IsOptional() @IsString() fallbackRateCurrencyId!: string | null;
            @IsString() ticker!: string;
        }

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const newCurrency = await CurrencyService.createCurrency
        (
            authResult.ownerUserId,
            parsedBody.name,
            parsedBody.fallbackRateAmount ? new Decimal(parsedBody.fallbackRateAmount) : undefined,
            parsedBody.fallbackRateCurrencyId ?? undefined,
            parsedBody.ticker,
            GlobalCurrencyCache
        );

        if (newCurrency instanceof CurrencyNameTakenError) throw createHttpError(400, newCurrency.message);
        if (newCurrency instanceof CurrencyNotFoundError) throw createHttpError(400, newCurrency.message);
        if (newCurrency instanceof CurrencyTickerTakenError) throw createHttpError(400, newCurrency.message);
        if (newCurrency instanceof CurrencyRefCurrencyIdAmountTupleError) throw createHttpError(400, newCurrency.message);
        if (newCurrency instanceof UserNotFoundError) throw createHttpError(401);

        return { id: newCurrency.id }
    }
});

router.get<GetCurrencyAPI.ResponseDTO>(`/api/v1/currencies`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsString() name!: string;
            @IsOptional() @IsString() id!: string;
            /** Which date should the rate of this currency be calculated against */
            @IsOptional() @IsNumberString() date!: string;
        }

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);

        if (parsedQuery.id && parsedQuery.name)
            throw createHttpError(400, `Name and ID cannot be both provided at the same time.`);

        const userQuery =
        {
            start: parsedQuery.start ? parseInt(parsedQuery.start) : undefined,
            end: parsedQuery.end ? parseInt(parsedQuery.end) : undefined,
            name: parsedQuery.name,
            id: parsedQuery.id,
            requestedRateDate: parsedQuery.date === undefined ? now : parseInt(parsedQuery.date)
        };

        const sqlPrimitiveCurrencies = await PaginationAPIResponseClass.prepareFromQueryItems
        (
            unwrap(await Database.getCurrencyRepository()!.getCurrencies(authResult.ownerUserId,
            {
                startIndex: userQuery.start,
                endIndex: userQuery.end,
                id: userQuery.id,
                name: userQuery.name
            })),
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
                    userQuery.requestedRateDate,
                    GlobalCurrencyRateDatumsCache,
                    GlobalCurrencyToBaseRateCache,
                    GlobalCurrencyCache,
                    GlobalUserCache
                );
                return rateHydratedCurrencies.map(c =>
                {
                    const curr = sqlPrimitiveCurrencies.rangeItems.find(x => x.id === c.currency.id)!;
                    return {
                        fallbackRateAmount: c.currency.fallbackRateAmount ?? null,
                        id: c.currency.id,
                        isBase: c.currency.isBase,
                        name: curr.name,
                        owner: curr.ownerId,
                        rateToBase: c.rateToBase,
                        fallbackRateCurrencyId: c.currency.fallbackRateCurrencyId ?? null,
                        ticker: curr.ticker
                    }
                });
            })()
        }
    }
});

router.get<GetCurrencyRateHistoryAPI.ResponseDTO>(`/api/v1/currencies/history`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query implements GetCurrencyRateHistoryAPI.RequestQueryDTO
        {
            @IsString() id!: string;
            @IsOptional() @IsIntString() division!: string;
            @IsOptional() @IsIntString() startDate?: string;
            @IsOptional() @IsIntString() endDate?: string;
        }

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const datums = unwrap(await CurrencyRateDatumService.getCurrencyRateHistory
        (
            authResult.ownerUserId,
            parsedQuery.id,
            parsedQuery.startDate ? parseInt(parsedQuery.startDate) : undefined,
            parsedQuery.endDate ? parseInt(parsedQuery.endDate) : undefined,
            GlobalCurrencyRateDatumsCache,
            GlobalCurrencyToBaseRateCache,
            GlobalCurrencyCache,
            GlobalUserCache,
            parsedQuery.division ? parseInt(parsedQuery.division) : 128,
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