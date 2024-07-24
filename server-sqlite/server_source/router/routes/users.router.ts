import { IsNotEmpty, IsString, validate } from 'class-validator';
import { UserService } from '../../db/services/user.service.js';
import express, { NextFunction } from 'express';
import { ExpressValidations } from '../validation.js';

const router = express.Router();

router.post("/api/v1/users", async (req:express.Request, res:express.Response, next: NextFunction) => 
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
        const newUser = await UserService.registerUser(req.body.username, req.body.password);
        res.json({
            userid: newUser.id
        });
    }
    catch(e) { next(e); }
});

export default router;
