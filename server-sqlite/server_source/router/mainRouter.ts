import express from 'express';
import { EnvManager } from '../env.js';
import devOnlyRouter from './routes/dev.router.js';

export default function getMainRouter()
{
    const router = express.Router();

    if (EnvManager.envType === 'Development') 
        router.use("/", devOnlyRouter);

    return router;
}