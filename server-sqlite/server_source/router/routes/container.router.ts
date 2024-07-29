import express, { NextFunction } from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { ContainerService } from '../../db/services/container.service.js';

const router = express.Router();

router.get("/api/v1/container", async (req: express.Request, res: express.Response, next: NextFunction) => 
{
   try
   {
        class query
        {
            @IsOptional() @IsString() id: string;
            @IsOptional() @IsString() name: string;
        }
        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        res.json(await ContainerService.getManyContainers(authResult.ownerUserId, parsedBody))
   }
   catch(e) { next(e); } 
});

router.post("/api/v1/container", async (req: express.Request, res: express.Response, next: NextFunction) => 
{
    try
    {
        class body
        {
            @IsString() name: string; 
        }

        const authResult = await AccessTokenService.ensureRequestTokenValidated(req);
        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        res.json(await ContainerService.createContainer(authResult.ownerUserId, parsedBody.name)); 
    }
    catch(e) { next(e); }
});

export default router;