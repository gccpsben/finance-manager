import express from 'express';
import { EnvManager } from '../env.js';
import devOnlyRouter from './routes/dev.router.js';
import userRouter from './routes/users.router.js';
import authRouter from './routes/auth.router.js';
import currenciesRouter from './routes/currencies.router.js';
import containerRouter from './routes/container.router.js';
import txnTagsRouter from './routes/txnTags.router.js';
import transactionsRouter from './routes/transaction.router.js';
import calculationsRouter from './routes/calculations.router.js';
import currencyRateDatumRouter from './routes/currencyRateDatum.router.js';
import currencyRateDatumSrcsRouter from './routes/currencyRateSource.router.js';
import filesRouter from './routes/files.router.js';
import { ExtendedLog } from '../debug/extendedLog.js';

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
    router.use("/", txnTagsRouter);
    router.use("/", transactionsRouter);
    router.use("/", calculationsRouter);
    router.use("/", currencyRateDatumRouter);
    router.use("/", currencyRateDatumSrcsRouter);
    router.use("/", filesRouter);

    if (EnvManager.distFolderLocation)
        router.use(express.static(EnvManager.distFolderLocation));
    else
        ExtendedLog.logYellow(`distFolderLocation is not set. Static dist folder's router will not be mounted.`);

    return router;
}