import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { IsDateString, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { IsDecimalJSString } from '../../db/validators.js';
import type { PostCurrencyRateDatumDTO, ResponsePostCurrencyRateDatumDTO } from "../../../../api-types/currencyRateDatum.js";
import { TypesafeRouter } from '../typescriptRouter.js';
import { CurrencyRateDatumService } from '../../db/services/currencyRateDatum.service.js';

const router = new TypesafeRouter(express.Router());

router.post<ResponsePostCurrencyRateDatumDTO>(`/api/v1/currencyRateDatums`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class body implements PostCurrencyRateDatumDTO
        {
            @IsDecimalJSString() amount: string;
            @IsString() refCurrencyId: string;
            @IsString() refAmountCurrencyId: string;
            @IsUTCDateInt() date: number;
        }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);

        const newRateDatum = await CurrencyRateDatumService.createCurrencyRateDatum
        (
            authResult.ownerUserId,
            parsedBody.amount,
            parsedBody.date,
            parsedBody.refCurrencyId,
            parsedBody.refAmountCurrencyId
        );
        return { id: newRateDatum.id };
    }
});

export default router.getRouter();