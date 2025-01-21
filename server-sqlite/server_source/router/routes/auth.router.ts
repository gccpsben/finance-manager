import { IsNotEmpty, IsString } from 'class-validator';
import { UserNotFoundError, UserService } from '../../db/services/user.service.js';
import express from 'express';
import { ExpressValidations } from '../validation.js';
import createHttpError from 'http-errors';
import type { PostLoginAPI } from '../../../../api-types/auth.d.ts';
import { TypesafeRouter } from '../typescriptRouter.js';
import { Database } from '../../db/db.js';

const router = new TypesafeRouter(express.Router());

router.post<PostLoginAPI.ResponseDTO>("/api/v1/auth/login",
{
    handler: async (req:express.Request, res:express.Response) =>
    {
        class body implements PostLoginAPI.RequestDTO
        {
            @IsString() @IsNotEmpty() username: string;
            @IsString() @IsNotEmpty() password: string;
        };

        const now = Date.now();
        await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const authResult = await UserService.validatePassword(req.body.username, req.body.password);
        if (!authResult.success) throw createHttpError(401);

        const newToken = await Database.getAccessTokenRepository()!.generateTokenForUser(authResult.userId!, now);
        if (newToken instanceof UserNotFoundError) throw createHttpError(401);

        return {
            token: newToken.tokenRaw,
            creationDate: newToken.creationDate,
            expiryDate: newToken.expiryDate,
            owner: newToken.ownerId
        }
    }
});

export default router.getRouter();
