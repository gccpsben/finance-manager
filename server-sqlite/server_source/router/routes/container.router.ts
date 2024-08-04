import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { ContainerService } from '../../db/services/container.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import type { PostContainerDTO, ResponseGetContainerDTO, ResponsePostContainerDTO } from '../../../../api-types/container.js';

const router = new TypesafeRouter(express.Router());

router.get<ResponseGetContainerDTO>(`/api/v1/containers`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        class query
        {
            @IsOptional() @IsString() id: string;
            @IsOptional() @IsString() name: string;
        }
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const containers = await ContainerService.getManyContainers(authResult.ownerUserId, parsedBody);

        return containers.map(con => (
        {
            creationDate: con.creationDate.toISOString(),
            id: con.id,
            name: con.name,
            owner: con.owner.id
        }));
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