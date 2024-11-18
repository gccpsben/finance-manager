import express, { NextFunction, Router } from 'express';
import { EnvManager } from '../env.js';
import devOnlyRouter from './routes/dev.router.js';
import userRouter from './routes/users.router.js';
import authRouter from './routes/auth.router.js';
import currenciesRouter from './routes/currencies.router.js';
import containerRouter from './routes/container.router.js';
import transactionTypesRouter from './routes/transactionType.router.js';
import transactionsRouter from './routes/transaction.router.js';
import calculationsRouter from './routes/calculations.router.js';
import currencyRateDatumRouter from './routes/currencyRateDatum.router.js';
import currencyRateDatumSrcsRouter from './routes/currencyRateSource.router.js';

export function getMainRouter()
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
    router.use("/", transactionsRouter);
    router.use("/", calculationsRouter);
    router.use("/", currencyRateDatumRouter);
    router.use("/", currencyRateDatumSrcsRouter);
    router.use(express.static(EnvManager.distFolderLocation));

    return router;
}