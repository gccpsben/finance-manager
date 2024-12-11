import { IsNotEmpty, IsString } from 'class-validator';
import { UserNotFoundError, UserService } from '../../db/services/user.service.js';
import express, { NextFunction } from 'express';
import { ExpressValidations } from '../validation.js';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import createHttpError from 'http-errors';
import type { PostLoginAPI } from '../../../../api-types/auth.js';
import { TypesafeRouter } from '../typescriptRouter.js';

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
        const newToken = await AccessTokenService.generateTokenForUser(authResult.userId!, now);
        if (newToken instanceof UserNotFoundError) throw createHttpError(401);

        return {
            token: newToken.token,
            creationDate: newToken.creationDate,
            expiryDate: newToken.expiryDate,
            owner: newToken.ownerId
        }
    }
});

export default router.getRouter();
