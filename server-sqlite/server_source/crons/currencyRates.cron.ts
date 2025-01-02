import { Database } from "../db/db.js";
import { CurrencyRepository } from "../db/repositories/currency.repository.js";
import { CurrencyRateSourceRepository } from "../db/repositories/currencyRateSource.repository.js";
import { CurrencyNotFoundError, CurrencyService } from "../db/services/currency.service.js";
import { CurrencyRateSourceService, ExecuteCurrencyRateSourceError } from "../db/services/currencyRateSource.service.js";
import { UserNotFoundError } from "../db/services/user.service.js";
import { ExtendedLog } from "../debug/extendedLog.js";
import { CronService } from "./cronService.js";
import { QUERY_IGNORE } from "../symbols.js";
import { GlobalCurrencyCache } from "../db/caches/currencyListCache.cache.js";
import { GlobalCurrencyToBaseRateCache } from "../db/caches/currencyToBaseRate.cache.js";
import { GlobalCurrencyRateDatumsCache } from "../db/caches/currencyRateDatumsCache.cache.js";

export class CurrencyRatesCRON implements CronService
{
    #isRunning = false;
    mainIntervalId: NodeJS.Timeout;

    async init(): Promise<void> {
        ExtendedLog.logCyan(`Initializing currency rates CRON.`);
        await new Promise<void>(resolve => resolve());
        ExtendedLog.logCyan(`Initialized currency rates CRON.`);
    }
    async start(): Promise<void>
    {
        this.#isRunning = true;
        ExtendedLog.logCyan(`Starting currency rates CRON.`);
        const currRepo = Database.getCurrencyRepository()!;

        this.mainIntervalId = setInterval(async () =>
        {
            const now = Date.now();

            // Fetch all currencies (using repository)
            const allCurrenciesToBeUpdated = await Database.getCurrencyRepository()!.getAllUsersCurrWithSources();
            for (const [_currencyId, { currency, rateSources }] of Object.entries(allCurrenciesToBeUpdated))
            {
                if (rateSources.length === 0) continue;
                if (!!currency.lastRateCronUpdateTime && now - currency.lastRateCronUpdateTime < 10_800_000)
                    continue;

                // Sort the sources from least recently used to most recently used.
                const sourcesSortedByLeastUsed = rateSources.sort();
                sourcesSortedByLeastUsed.sort((a,b) => (a.lastExecuteTime ?? 0) - (b.lastExecuteTime ?? 0));

                const currencyObj = (await currRepo.findCurrencyByIdNameTickerOne(currency.ownerId, currency.id, QUERY_IGNORE, QUERY_IGNORE, GlobalCurrencyCache));
                if (currencyObj instanceof UserNotFoundError) continue;
                if (currencyObj === null) continue;

                // Loop through all rate sources for this currency until one succeeds.
                for (const src of sourcesSortedByLeastUsed)
                {
                    const fullRateSrc = await CurrencyRateSourceRepository.getInstance().findOneBy({id: src.id ?? null});
                    if (!fullRateSrc) continue;

                    currencyObj.lastRateCronUpdateTime = now;
                    await Database.getCurrencyRepository()!.updateCurrency(currencyObj, GlobalCurrencyCache);

                    ExtendedLog.logCyan(`Fetching rate of ticker='${currency.ticker}', hostname='${fullRateSrc.hostname}', path='${fullRateSrc.path}' using source name='${src.name}'`);

                    const transactionContext = await Database.createTransactionalContext();
                    const fetchResult = await CurrencyRateSourceService.executeCurrencyRateSource
                    (
                        currency.ownerId,
                        fullRateSrc,
                        now,
                        transactionContext.queryRunner,
                        GlobalCurrencyRateDatumsCache,
                        GlobalCurrencyToBaseRateCache,
                        GlobalCurrencyCache
                    );

                    if (fetchResult instanceof ExecuteCurrencyRateSourceError)
                    {
                        await transactionContext.endFailure();
                        ExtendedLog.logCyan(`Error fetching ticker='${currency.ticker}', hostname='${fullRateSrc.hostname}', path='${fullRateSrc.path}': ${fetchResult.message}`);
                        if (fetchResult.error instanceof CurrencyNotFoundError) continue;
                        if (fetchResult.error instanceof UserNotFoundError) continue;
                        if (fetchResult.error instanceof UserNotFoundError) continue;
                        continue;
                    }
                    else
                    {
                        await transactionContext.endSuccess();
                        ExtendedLog.logGreen(`Successfully fetched latest rate of ${currency.ticker} (id='${currency.id}').`);
                        break;
                    }
                }
            }
        }, 10000);

        ExtendedLog.logCyan(`Started currency rates CRON.`);
    }
    async stop(): Promise<void> {
        this.#isRunning = false;
        ExtendedLog.logCyan(`Stopping currency rates CRON.`);
        await new Promise<void>(resolve => resolve());
        ExtendedLog.logCyan(`Stopped currency rates CRON.`);
    }
    getIsRunning() { return this.#isRunning; }
}