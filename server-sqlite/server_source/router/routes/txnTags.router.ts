import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.ts';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ExpressValidations } from '../validation.ts';
import { TxnTagService, TxnTagExistsError } from '../../db/services/txnTag.service.ts';
import { TypesafeRouter } from '../typescriptRouter.ts';
import type { GetTxnTagsAPI, PostTxnTagsAPI } from '../../../../api-types/txnTag.d.ts';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../pagination.ts';
import createHttpError from 'http-errors';
import { UserNotFoundError } from '../../db/services/user.service.ts';
import { UUID } from "node:crypto";

const router = new TypesafeRouter(express.Router());

router.get<GetTxnTagsAPI.ResponseDTO>(`/api/v1/transactionTags`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsUUID(4) @IsString() id!: UUID;
            @IsOptional() @IsString() name!: string;
        }

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const userQuery =
        {
            start: parsedQuery.start ? parseInt(parsedQuery.start) : undefined,
            end: parsedQuery.end ? parseInt(parsedQuery.end) : undefined,
            name: parsedQuery.name,
            id: parsedQuery.id
        };

        const userTxnTags = await TxnTagService.getUserTxnTags(authResult.ownerUserId,
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
    handler: async (req: express.Request, _res: express.Response) =>
    {
        class body implements PostTxnTagsAPI.RequestDTO
        {
            @IsString() @IsNotEmpty() name!: string;
        }

        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const createdTag = await TxnTagService.createTxnTag(authResult.ownerUserId, parsedBody.name);
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