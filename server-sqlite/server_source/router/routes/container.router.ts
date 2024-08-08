import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { ContainerService } from '../../db/services/container.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import type { PostContainerDTO, ResponseGetContainerDTO, ResponsePostContainerDTO } from '../../../../api-types/container.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../logics/pagination.js';
import { SQLitePrimitiveOnly } from '../../index.d.js';
import { Container } from '../../db/entities/container.entity.js';

const router = new TypesafeRouter(express.Router());

router.get<ResponseGetContainerDTO>(`/api/v1/containers`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
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
        
        const response = await PaginationAPIResponseClass.prepareFromQueryItems
        (
            await ContainerService.getManyContainers(authResult.ownerUserId, 
            {
                startIndex: userQuery.start,
                endIndex: userQuery.end,
                id: userQuery.id,
                name: userQuery.name
            }),
            userQuery.start
        );

        return {
            totalItems: response.totalItems,
            endingIndex: response.endingIndex,
            startingIndex: response.startingIndex,
            rangeItems: response.rangeItems.map(item => (
            {
                creationDate: item.creationDate,
                id: item.id,
                name: item.name,
                owner: item.ownerId
            }))
        };
    }
});

router.post<ResponsePostContainerDTO>(`/api/v1/containers`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        class body implements PostContainerDTO { @IsString() name: string; }
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const containerCreated = await ContainerService.createContainer(authResult.ownerUserId, parsedBody.name);
        return { id: containerCreated.id }
    }
})

export default router.getRouter();