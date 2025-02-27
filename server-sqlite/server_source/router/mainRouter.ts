// @ts-types="npm:@types/express@5.0.0"
import express from "npm:express@5.0.1";
import devOnlyRouter from './routes/dev.router.ts';
import userRouter from './routes/users.router.ts';
import authRouter from './routes/auth.router.ts';
import currenciesRouter from './routes/currencies.router.ts';
import containerRouter from './routes/container.router.ts';
import txnTagsRouter from './routes/txnTags.router.ts';
import transactionsRouter from './routes/transaction.router.ts';
import calculationsRouter from './routes/calculations.router.ts';
import currencyRateDatumRouter from './routes/currencyRateDatum.router.ts';
import currencyRateDatumSrcsRouter from './routes/currencyRateSource.router.ts';
import filesRouter from './routes/files.router.ts';
import { ExtendedLogger } from '../debug/extendedLog.ts';
import { EnvSettings } from '../env.ts';

export function getMainRouter(
    logger: ExtendedLogger,
    env: EnvSettings
)
{
    const router = express.Router();

    if (env.nodeEnv === 'Development')
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

    if (env.server.distFolderPath)
    {
        router.use(express.static(env.server.distFolderPath));
        router.get("/manifest.webmanifest", (_, res) => { res.sendFile(`manifest.webmanifest`, { root: env.server.distFolderPath }); });
        router.get("/manifest.json", (_, res) => { res.sendFile(`manifest.webmanifest`, { root: env.server.distFolderPath }); });
        router.get("/assets/*splat", (req, res) => { res.sendFile(req.path, { root: env.server.distFolderPath }); });
        router.get("/*splat", (_, res) => { res.sendFile("index.html", { root: env.server.distFolderPath }); });
    }
    else
        logger.logYellow(`distFolderLocation is not set. Static dist folder's router will not be mounted.`);

    return router;
}