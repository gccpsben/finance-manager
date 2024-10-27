import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { TransactionTypeService, TxnTypeExistsError } from '../../db/services/transactionType.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import type { GetTxnTypesAPI, PostTxnTypesAPI } from '../../../../api-types/txnType.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../logics/pagination.js';
import createHttpError from 'http-errors';
import { UserNotFoundError } from '../../db/services/user.service.js';

const router = new TypesafeRouter(express.Router());

router.get<GetTxnTypesAPI.ResponseDTO>(`/api/v1/transactionTypes`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsString() id: string;
            @IsOptional() @IsString() name: string;
        }

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const userQuery =
        {
            start: parsedQuery.start ? parseInt(parsedQuery.start) : undefined,
            end: parsedQuery.end ? parseInt(parsedQuery.end) : undefined,
            name: parsedQuery.name,
            id: parsedQuery.id
        };

        const userTxnTypes = await TransactionTypeService.getUserTransactionTypes(authResult.ownerUserId,
        {
            startIndex: userQuery.start,
            endIndex: userQuery.end,
            id: userQuery.id,
            name: userQuery.name
        });
        if (userTxnTypes instanceof UserNotFoundError) throw createHttpError(401);

        const response = await PaginationAPIResponseClass.prepareFromQueryItems(userTxnTypes,userQuery.start);

        return {
            endingIndex: response.endingIndex,
            startingIndex: response.startingIndex,
            totalItems: response.totalItems,
            rangeItems: response.rangeItems.map(type => (
            {
                id: type.id,
                name: type.name,
                owner: type.ownerId
            })),
        };
    }
});

router.post<PostTxnTypesAPI.ResponseDTO>(`/api/v1/transactionTypes`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class body implements PostTxnTypesAPI.RequestDTO
        {
            @IsString() @IsNotEmpty() name: string;
        }

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const createdType = await TransactionTypeService.createTransactionType(authResult.ownerUserId, parsedBody.name);
        if (createdType instanceof TxnTypeExistsError) throw createHttpError(400, createdType.message);

        return (
        {
            id: createdType.id,
            name: createdType.name,
            owner: createdType.owner.id
        });
    }
});

export default router.getRouter();