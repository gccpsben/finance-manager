import { isNotEmpty, IsNotEmpty, IsOptional, IsString, validate } from 'class-validator';
import { UserService } from '../../db/services/user.service.js';
import express, { NextFunction } from 'express';
import { ExpressValidations } from '../validation.js';
import createHttpError from 'http-errors';

const router = express.Router();

router.post("/api/v1/users", async (req:express.Request, res:express.Response, next: NextFunction) => 
{ 
    try
    {
        class body
        {
            @IsString() @IsNotEmpty() username: string;
            @IsString() @IsNotEmpty() password: string;
        }; 
        
        await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const newUser = await UserService.registerUser(req.body.username, req.body.password);
        res.json({
            userid: newUser.id
        });
    }
    catch(e) { next(e); }
});

router.delete("/api/v1/users", async (req: express.Request, res:express.Response, next: NextFunction) => 
{
    try
    {
        class body
        {
            @IsNotEmpty() @IsString() userId: string;
        }

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const deletionResult = await UserService.tryDeleteUser(parsedBody.userId);
        if (!deletionResult.userFound) throw createHttpError(404, "Unable to find the user provided.");
        else return res.json({});
    }   
    catch(e) { next(e) }
});

export default router;
