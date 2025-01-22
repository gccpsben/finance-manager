import { TypesafeRouter } from "../typescriptRouter.ts";
import express from 'express';
import type { GetCurrencyRateSrcAPI, PostCurrencyRateSrcAPI, PatchCurrencyRateSrcAPI, GetCurrencyRateSrcBySrcIdAPI, DeleteCurrencyRateSrcAPI } from "../../../../api-types/currencyRateSource.d.ts";
import { IsString } from "class-validator";
import { AccessTokenService, InvalidLoginTokenError } from "../../db/services/accessToken.service.ts";
import createHttpError from "http-errors";
import { ExpressValidations } from "../validation.ts";
import { CurrencyRateSourceService, CurrencySrcNotFoundError, PatchCurrencySrcValidationError } from "../../db/services/currencyRateSource.service.ts";
import { CurrencyNotFoundError } from "../../db/services/currency.service.ts";
import { GlobalCurrencyCache } from "../../db/caches/currencyListCache.cache.ts";

const router = new TypesafeRouter(express.Router());

router.get<GetCurrencyRateSrcBySrcIdAPI.ResponseDTO>(`/api/v1/currencyRateSources/:id` satisfies GetCurrencyRateSrcBySrcIdAPI.Path<':id'>,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const rateSrc = await CurrencyRateSourceService.getCurrencyRatesSourceById(authResult.ownerUserId, req.params['id']);
        if (rateSrc === null) throw createHttpError(404);

        return {
            hostname: rateSrc.hostname,
            refCurrencyId: rateSrc.refCurrencyId,
            refAmountCurrencyId: rateSrc.refAmountCurrencyId,
            path: rateSrc.path,
            jsonQueryString: rateSrc.jsonQueryString,
            name: rateSrc.name,
            lastExecuteTime: rateSrc.lastExecuteTime ?? null,
            id: rateSrc.id
        };
    }
});

router.get<GetCurrencyRateSrcAPI.ResponseDTO>(`/api/v1/:id/currencyRateSources` satisfies GetCurrencyRateSrcAPI.Path<':id'>,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const rateSources = await CurrencyRateSourceService.getUserCurrencyRatesSourcesOfCurrency(authResult.ownerUserId, req.params['id']);

        return {
            sources: rateSources.map(s => (
            {
                hostname: s.hostname,
                refCurrencyId: s.refCurrencyId,
                refAmountCurrencyId: s.refAmountCurrencyId,
                path: s.path,
                jsonQueryString: s.jsonQueryString,
                name: s.name,
                lastExecuteTime: s.lastExecuteTime ?? null,
                id: s.id
            }))
        };
    }
});

router.patch<PatchCurrencyRateSrcAPI.ResponseDTO>(`/api/v1/currencyRateSources`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class body implements PatchCurrencyRateSrcAPI.RequestDTO
        {
            @IsString() id: string;
            @IsString() refAmountCurrencyId: string;
            @IsString() hostname: string;
            @IsString() path: string;
            @IsString() jsonQueryString: string;
            @IsString() name: string;
        }

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);

        const newlyPatchRateSrc = await CurrencyRateSourceService.patchUserCurrencyRateSource
        (
            authResult.ownerUserId,
            {
                id: parsedBody.id,
                hostname: parsedBody.hostname,
                jsonQueryString: parsedBody.jsonQueryString,
                name: parsedBody.name,
                path: parsedBody.path,
                refAmountCurrencyId: parsedBody.refAmountCurrencyId
            },
            GlobalCurrencyCache
        );

        if (newlyPatchRateSrc instanceof CurrencySrcNotFoundError) throw createHttpError(400, newlyPatchRateSrc.message);
        if (newlyPatchRateSrc instanceof PatchCurrencySrcValidationError) throw createHttpError(400, newlyPatchRateSrc.message);
        return {
            hostname: newlyPatchRateSrc.hostname,
            id: newlyPatchRateSrc.id,
            jsonQueryString: newlyPatchRateSrc.jsonQueryString,
            lastExecuteTime: newlyPatchRateSrc.lastExecuteTime,
            name: newlyPatchRateSrc.name,
            path: newlyPatchRateSrc.path,
            refAmountCurrencyId: newlyPatchRateSrc.refAmountCurrencyId,
            refCurrencyId: newlyPatchRateSrc.refCurrencyId
        };
    }
});

router.delete<DeleteCurrencyRateSrcAPI.ResponseDTO>(`/api/v1/currencyRateSources/:id` satisfies DeleteCurrencyRateSrcAPI.Path<string>,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const requestedId = req.params['id'];
        const deleteResult = await CurrencyRateSourceService.deleteCurrencyRateSource(authResult.ownerUserId, requestedId);
        if (deleteResult instanceof CurrencySrcNotFoundError) throw createHttpError(404, deleteResult.message);
        return { id: requestedId };
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

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
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
            parsedBody.refCurrencyId,
            GlobalCurrencyCache
        );

        if (newRateSrc instanceof CurrencyNotFoundError) throw createHttpError(400, newRateSrc.message);

        return { id: newRateSrc.id };
    }
});

export default router.getRouter();