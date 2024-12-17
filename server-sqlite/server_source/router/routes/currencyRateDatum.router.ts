import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString, IsUTCDateInt } from '../../db/validators.js';
import type { PostCurrencyRateAPI } from "../../../../api-types/currencyRateDatum.js";
import { TypesafeRouter } from '../typescriptRouter.js';
import { CurrencyRateDatumService } from '../../db/services/currencyRateDatum.service.js';
import createHttpError from 'http-errors';
import { unwrap } from '../../std_errors/monadError.js';
import { UserNotFoundError } from '../../db/services/user.service.js';
import { CurrencyNotFoundError } from '../../db/services/currency.service.js';
import { Type } from 'class-transformer';
import { Database } from '../../db/db.js';

const router = new TypesafeRouter(express.Router());

router.post<PostCurrencyRateAPI.ResponseDTO>(`/api/v1/currencyRateDatums`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class bodyItem implements PostCurrencyRateAPI.RequestItemDTO
        {
            @IsDecimalJSString() amount: string;
            @IsString() refCurrencyId: string;
            @IsString() refAmountCurrencyId: string;
            @IsUTCDateInt() date: number;
        }

        class body implements PostCurrencyRateAPI.RequestDTO
        {
            @IsArray()
            @ValidateNested({ each: true })
            @Type(() => bodyItem)
            datums: bodyItem[];
        }

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const transactionContext = await Database.createTransactionalContext();

        const newRateDatums = await CurrencyRateDatumService.createCurrencyRateDatum
        (
            parsedBody.datums.map(datum => (
            {
                userId: authResult.ownerUserId,
                amount: datum.amount,
                date: datum.date,
                currencyId: datum.refCurrencyId,
                amountCurrencyId: datum.refAmountCurrencyId,
            })),
            transactionContext.queryRunner
        );

        if (newRateDatums instanceof UserNotFoundError) throw createHttpError(401);
        if (newRateDatums instanceof CurrencyNotFoundError) throw createHttpError(400, newRateDatums.message);

        await transactionContext.endSuccess();
        return { ids: newRateDatums.map(x => x.id) };
    }
});

export default router.getRouter();