import { CurrencyRepository } from "../db/repositories/currency.repository.js";
import { CurrencyRateSourceRepository } from "../db/repositories/currencyRateSource.repository.js";
import { CurrencyNotFoundError, CurrencyService } from "../db/services/currency.service.js";
import { CurrencyRateSourceService, ExecuteCurrencyRateSourceError } from "../db/services/currencyRateSource.service.js";
import { UserNotFoundError } from "../db/services/user.service.js";
import { ExtendedLog } from "../debug/extendedLog.js";
import { CronService } from "./cronService.js";

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

        this.mainIntervalId = setInterval(async () =>
        {
            // Fetch all currencies (using repository)
            const allCurrenciesToBeUpdated = await CurrencyRepository.getInstance().getAllUsersCurrWithSources();
            for (const [_currencyId, { currency, rateSources }] of Object.entries(allCurrenciesToBeUpdated))
            {
                if (rateSources.length === 0) continue;
                if (!!currency.lastRateCronUpdateTime && Date.now() - currency.lastRateCronUpdateTime < 10_800_000)
                    continue;

                // Sort the sources from least recently used to most recently used.
                const sourcesSortedByLeastUsed = rateSources.sort();
                sourcesSortedByLeastUsed.sort((a,b) => (a.lastExecuteTime ?? 0) - (b.lastExecuteTime ?? 0));

                const currencyObj = (await CurrencyService.getCurrencyByIdWithoutCache(currency.ownerId, currency.id));
                if (currencyObj instanceof UserNotFoundError) continue;
                if (currencyObj === null) continue;

                // Loop through all rate sources for this currency until one succeeds.
                for (const src of sourcesSortedByLeastUsed)
                {
                    const fullRateSrc = await CurrencyRateSourceRepository.getInstance().findOneBy({id: src.id ?? null});
                    if (!fullRateSrc) continue;

                    currencyObj.lastRateCronUpdateTime = Date.now();
                    await CurrencyRepository.getInstance().save(currencyObj);

                    ExtendedLog.logCyan(`Fetching rate of ticker='${currency.ticker}', hostname='${fullRateSrc.hostname}', path='${fullRateSrc.path}' using source name='${src.name}'`);
                    const fetchResult = await CurrencyRateSourceService.executeCurrencyRateSource(currency.ownerId, fullRateSrc);

                    if (fetchResult instanceof ExecuteCurrencyRateSourceError)
                    {
                        ExtendedLog.logCyan(`Error fetching ticker='${currency.ticker}', hostname='${fullRateSrc.hostname}', path='${fullRateSrc.path}': ${fetchResult.message}`);
                        if (fetchResult.error instanceof CurrencyNotFoundError) continue;
                        if (fetchResult.error instanceof UserNotFoundError) continue;
                        if (fetchResult.error instanceof UserNotFoundError) continue;
                        continue;
                    }
                    else
                    {
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