import { IsNotEmpty, IsString, validate } from 'class-validator';
import { UserService } from '../../db/services/user.service.js';
import express, { NextFunction } from 'express';
import { ExpressValidations } from '../validation.js';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import createHttpError from 'http-errors';

const router = express.Router();

router.post("/api/v1/auth/login", async (req:express.Request, res:express.Response, next: NextFunction) => 
{ 
    try
    {
        class body
        {
            @IsString() @IsNotEmpty()
            username: string;

            @IsString() @IsNotEmpty()
            password: string;
        }; 
        
        await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const authResult = await UserService.validatePassword(req.body.username, req.body.password);
        if (!authResult.success) throw createHttpError(401);
        const newToken = await AccessTokenService.generateTokenForUser(authResult.userId);
        res.json(newToken);
    }
    catch(e) { next(e); }
});

export default router;
