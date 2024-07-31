import express from 'express';
import { EnvManager } from '../env.js';
import devOnlyRouter from './routes/dev.router.js';
import userRouter from './routes/users.router.js';
import authRouter from './routes/auth.router.js';
import currenciesRouter from './routes/currencies.router.js';
import containerRouter from './routes/container.router.js';
import transactionTypesRouter from './routes/transactionType.router.js';

export default function getMainRouter()
{
    const router = express.Router();

    if (EnvManager.envType === 'Development') 
        router.use("/", devOnlyRouter);
    
    router.use("/", userRouter);
    router.use("/", authRouter);
    router.use("/", currenciesRouter);
    router.use("/", authRouter);
    router.use("/", containerRouter);
    router.use("/", transactionTypesRouter);
    router.use(express.static(EnvManager.distFolderLocation));

    return router;
}