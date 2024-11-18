import { TypesafeRouter } from "../typescriptRouter.js";
import express from 'express';
import type { GetCurrencyRateSrcAPI, PostCurrencyRateSrcAPI } from "../../../../api-types/currencyRateSource.js";
import { IsString } from "class-validator";
import { AccessTokenService, InvalidLoginTokenError } from "../../db/services/accessToken.service.js";
import createHttpError from "http-errors";
import { ExpressValidations } from "../validation.js";
import { CurrencyRateSourceService } from "../../db/services/currencyRateSource.service.js";
import { CurrencyNotFoundError } from "../../db/services/currency.service.js";

const router = new TypesafeRouter(express.Router());

router.get<GetCurrencyRateSrcAPI.ResponseDTO>(`/api/v1/currencyRateSources`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query implements GetCurrencyRateSrcAPI.RequestDTO
        {
            @IsString() targetCurrencyId: string;
        }

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const rateSources = await CurrencyRateSourceService.getUserCurrencyRatesSourcesOfCurrency(authResult.ownerUserId, parsedQuery.targetCurrencyId);

        return {
            sources: rateSources.map(s => (
            {
                hostname: s.hostname,
                refCurrencyId: s.refCurrencyId,
                refAmountCurrencyId: s.refAmountCurrencyId,
                path: s.path,
                jsonQueryString: s.jsonQueryString,
                name: s.name,
                lastExecuteTime: s.lastExecuteTime,
                id: s.id
            }))
        };
    }
});

router.post<PostCurrencyRateSrcAPI.ResponseDTO>(`/api/v1/currencyRateSources`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class body implements PostCurrencyRateSrcAPI.RequestDTO
        {
            @IsString() refCurrencyId: string;
            @IsString() refAmountCurrencyId: string;
            @IsString() hostname: string;
            @IsString() path: string;
            @IsString() jsonQueryString: string;
            @IsString() name: string;
        }

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);

        const newRateSrc = await CurrencyRateSourceService.createCurrencyRateSource
        (
            authResult.ownerUserId,
            parsedBody.hostname,
            parsedBody.name,
            parsedBody.jsonQueryString,
            parsedBody.path,
            parsedBody.refAmountCurrencyId,
            parsedBody.refCurrencyId
        );

        if (newRateSrc instanceof CurrencyNotFoundError) throw createHttpError(400, newRateSrc.message);

        return { id: newRateSrc.id };
    }
});

export default router.getRouter();