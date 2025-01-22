import { IsNotEmpty, IsString } from 'class-validator';
import { UserNameTakenError, UserService } from '../../db/services/user.service.ts';
import express from 'express';
import { ExpressValidations } from '../validation.ts';
import createHttpError from 'http-errors';
import type { DeleteUserAPI, PostUserAPI } from '../../../../api-types/user.d.ts';
import { TypesafeRouter } from '../typescriptRouter.ts';

const router = new TypesafeRouter(express.Router());

router.post<PostUserAPI.ResponseDTO>(`/api/v1/users`,
{
    handler: async (req:express.Request, _res:express.Response) =>
    {
        class body implements PostUserAPI.RequestDTO
        {
            @IsString() @IsNotEmpty() username!: string;
            @IsString() @IsNotEmpty() password!: string;
        };

        await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const newUser = await UserService.registerUser(req.body.username, req.body.password);
        if (newUser instanceof UserNameTakenError) throw createHttpError(400, newUser.message);

        return { userid: newUser.id };
    }
});

router.delete<DeleteUserAPI.ResponseDTO>("/api/v1/users",
{
    handler: async (req: express.Request, _res:express.Response) =>
    {
        class body implements DeleteUserAPI.RequestDTO
        {
            @IsNotEmpty() @IsString() userId!: string;
        }

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const deletionResult = await UserService.tryDeleteUser(parsedBody.userId);

        if (!deletionResult.userFound) throw createHttpError(404, "Unable to find the user provided.");
        else return {};
    }
});

export default router.getRouter();
