import express from 'express';
import { EnvManager } from '../env.js';
import devOnlyRouter from './routes/dev.router.js';
import userRouter from './routes/users.router.js';
import authRouter from './routes/auth.router.js';

export default function getMainRouter()
{
    const router = express.Router();

    if (EnvManager.envType === 'Development') 
        router.use("/", devOnlyRouter);
    router.use("/", userRouter);
    router.use("/", authRouter);

    return router;
}