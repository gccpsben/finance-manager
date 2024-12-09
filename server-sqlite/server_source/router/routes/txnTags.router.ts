import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { TransactionTagService, TxnTagExistsError } from '../../db/services/txnTag.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import type { GetTxnTagsAPI, PostTxnTagsAPI } from '../../../../api-types/txnTag.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../pagination.js';
import createHttpError from 'http-errors';
import { UserNotFoundError } from '../../db/services/user.service.js';

const router = new TypesafeRouter(express.Router());

router.get<GetTxnTagsAPI.ResponseDTO>(`/api/v1/transactionTags`,
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

        const userTxnTags = await TransactionTagService.getUserTxnTags(authResult.ownerUserId,
        {
            startIndex: userQuery.start,
            endIndex: userQuery.end,
            id: userQuery.id,
            name: userQuery.name
        });
        if (userTxnTags instanceof UserNotFoundError) throw createHttpError(401);

        const response = await PaginationAPIResponseClass.prepareFromQueryItems(userTxnTags,userQuery.start);

        return {
            endingIndex: response.endingIndex,
            startingIndex: response.startingIndex,
            totalItems: response.totalItems,
            rangeItems: response.rangeItems.map(tag => (
            {
                id: tag.id,
                name: tag.name,
                owner: tag.ownerId
            })),
        };
    }
});

router.post<PostTxnTagsAPI.ResponseDTO>(`/api/v1/transactionTags`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class body implements PostTxnTagsAPI.RequestDTO
        {
            @IsString() @IsNotEmpty() name: string;
        }

        const authResult = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const createdTag = await TransactionTagService.createTxnTag(authResult.ownerUserId, parsedBody.name);
        if (createdTag instanceof TxnTagExistsError) throw createHttpError(400, createdTag.message);
        if (createdTag instanceof UserNotFoundError) throw createHttpError(401);

        return (
        {
            id: createdTag.id,
            name: createdTag.name,
            owner: createdTag.ownerId
        });
    }
});

export default router.getRouter();