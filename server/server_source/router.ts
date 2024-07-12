import txnRouter from './routes/transactions';
import currenciesRouter from './routes/currencies';
import containersRouter from './routes/containers';
import accountsRouter from './routes/accounts';
import graphsRouter from './routes/graphs';
import txnTypesRouter from './routes/transactionTypes';
import apiRouter from './routes/api';
import staticAssetsRouter from './routes/staticAssets';
import devOnlyRouter from './routes/dev';
import batchRouter from './routes/batch';
import express = require("express");
import { isDevelopment } from './server';

export default function getMainRouter()
{
    const router = express.Router();

    if (isDevelopment) router.use("/", devOnlyRouter);
    router.use("/", currenciesRouter);
    router.use("/", containersRouter);
    router.use("/", txnRouter);
    router.use("/", accountsRouter);
    router.use("/", graphsRouter);
    router.use("/", txnTypesRouter);
    router.use("/", apiRouter);
    router.use("/", batchRouter);
    router.use("/", staticAssetsRouter); // static assets should be the last router

    return router;
}