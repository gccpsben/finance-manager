import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString, IsUTCDateInt } from '../../db/validators.js';
import type { PostCurrencyRateAPI } from "../../../../api-types/currencyRateDatum.js";
import { TypesafeRouter } from '../typescriptRouter.js';
import { CurrencyRateDatumService } from '../../db/services/currencyRateDatum.service.js';
import createHttpError from 'http-errors';
import { unwrap } from '../../std_errors/monadError.js';
import { UserNotFoundError } from '../../db/services/user.service.js';
import { CurrencyNotFoundError } from '../../db/services/currency.service.js';

const router = new TypesafeRouter(express.Router());

router.post<PostCurrencyRateAPI.ResponseDTO>(`/api/v1/currencyRateDatums`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class body implements PostCurrencyRateAPI.RequestDTO
        {
            @IsDecimalJSString() amount: string;
            @IsString() refCurrencyId: string;
            @IsString() refAmountCurrencyId: string;
            @IsUTCDateInt() date: number;
        }

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);

        const newRateDatum = await CurrencyRateDatumService.createCurrencyRateDatum
        (
            authResult.ownerUserId,
            parsedBody.amount,
            parsedBody.date,
            parsedBody.refCurrencyId,
            parsedBody.refAmountCurrencyId
        );

        if (newRateDatum instanceof UserNotFoundError) throw createHttpError(401);
        if (newRateDatum instanceof CurrencyNotFoundError) throw createHttpError(400, newRateDatum.message);

        return { id: newRateDatum.id };
    }
});

export default router.getRouter();