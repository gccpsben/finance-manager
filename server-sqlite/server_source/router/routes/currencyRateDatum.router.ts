import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.ts';
import { IsArray, IsString, ValidateNested, IsUUID } from 'class-validator';
import { ExpressValidations } from '../validation.ts';
import { IsDecimalJSString, IsUTCDateInt } from '../../db/validators.ts';
import type { PostCurrencyRateAPI } from "../../../../api-types/currencyRateDatum.d.ts";
import { TypesafeRouter } from '../typescriptRouter.ts';
import { CurrencyRateDatumService } from '../../db/services/currencyRateDatum.service.ts';
import createHttpError from 'http-errors';
import { UserNotFoundError } from '../../db/services/user.service.ts';
import { CurrencyNotFoundError } from '../../db/services/currency.service.ts';
import { Type } from 'class-transformer';
import { Database } from '../../db/db.ts';
import { GlobalCurrencyToBaseRateCache } from '../../db/caches/currencyToBaseRate.cache.ts';
import { GlobalCurrencyCache } from '../../db/caches/currencyListCache.cache.ts';
import { GlobalCurrencyRateDatumsCache } from '../../db/caches/currencyRateDatumsCache.cache.ts';
import { GlobalUserCache } from "../../db/caches/user.cache.ts";
import { UUID } from "node:crypto";

const router = new TypesafeRouter(express.Router());

router.post<PostCurrencyRateAPI.ResponseDTO>(`/api/v1/currencyRateDatums`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        class bodyItem implements PostCurrencyRateAPI.RequestItemDTO
        {
            @IsDecimalJSString() amount!: string;
            @IsString() @IsUUID(4) refCurrencyId!: UUID;
            @IsString() @IsUUID(4) refAmountCurrencyId!: UUID;
            @IsUTCDateInt() date!: number;
        }

        class body implements PostCurrencyRateAPI.RequestDTO
        {
            @IsArray()
            @ValidateNested({ each: true })
            @Type(() => bodyItem)
            datums!: bodyItem[];
        }

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const transactionContext = await Database.createTransactionalContext();

        const newRateDatums = await CurrencyRateDatumService.createCurrencyRateDatum
        (
            parsedBody.datums.map(datum =>
            {
                return {
                    userId: authResult.ownerUserId,
                    amount: datum.amount,
                    date: datum.date,
                    currencyId: datum.refCurrencyId,
                    amountCurrencyId: datum.refAmountCurrencyId,
                }
            }),
            transactionContext.queryRunner,
            GlobalCurrencyRateDatumsCache,
            GlobalCurrencyToBaseRateCache,
            GlobalCurrencyCache,
            GlobalUserCache
        );

        if (newRateDatums instanceof UserNotFoundError) throw createHttpError(401);
        if (newRateDatums instanceof CurrencyNotFoundError) throw createHttpError(400, newRateDatums.message);

        await transactionContext.endSuccess();
        return { ids: newRateDatums.map(x => x.id) };
    }
});

export default router.getRouter();