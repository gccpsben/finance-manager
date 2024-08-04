import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { TransactionTypeService } from '../../db/services/transactionType.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import type { ResponseGetTransactionTypesDTO, PostTransactionTypesDTO, ResponsePostTransactionTypesDTO } from '../../../../api-types/txnType.js';

const router = new TypesafeRouter(express.Router());

router.get<ResponseGetTransactionTypesDTO>(`/api/v1/transactionTypes`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const txnType = await TransactionTypeService.getUserTransactionTypes(authResult.ownerUserId);
        return txnType.map(t => (
        {
            id: t.id,
            name: t.name,
            owner: t.owner.id
        }));
    }
});

router.post<ResponsePostTransactionTypesDTO>(`/api/v1/transactionTypes`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class body implements PostTransactionTypesDTO
        { 
            @IsString() @IsNotEmpty() name: string; 
        }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const createdType = await TransactionTypeService.createTransactionType(authResult.ownerUserId, parsedBody.name);

        return (
        {
            id: createdType.id,
            name: createdType.name,
            owner: createdType.owner.id
        });
    }
});

export default router.getRouter();