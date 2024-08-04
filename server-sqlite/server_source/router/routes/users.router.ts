import { IsNotEmpty, IsString } from 'class-validator';
import { UserService } from '../../db/services/user.service.js';
import express, { NextFunction } from 'express';
import { ExpressValidations } from '../validation.js';
import createHttpError from 'http-errors';
import type { PostUserDTO, ResponseDeleteUserDTO, ResponsePostUserDTO } from '../../../../api-types/user.js';
import { TypesafeRouter } from '../typescriptRouter.js';

const router = new TypesafeRouter(express.Router());

router.post<ResponsePostUserDTO>(`/api/v1/users`, 
{
    handler: async (req:express.Request, res:express.Response) => 
    {   
        class body implements PostUserDTO
        {
            @IsString() @IsNotEmpty() username: string;
            @IsString() @IsNotEmpty() password: string;
        }; 
        
        await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const newUser = await UserService.registerUser(req.body.username, req.body.password);

        return { userid: newUser.id };
    }
});

router.delete<ResponseDeleteUserDTO>("/api/v1/users", 
{
    handler: async (req: express.Request, res:express.Response) => 
    {
        class body { @IsNotEmpty() @IsString() userId: string; }

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const deletionResult = await UserService.tryDeleteUser(parsedBody.userId);

        if (!deletionResult.userFound) throw createHttpError(404, "Unable to find the user provided.");
        else return {};
    }
});

export default router.getRouter();
