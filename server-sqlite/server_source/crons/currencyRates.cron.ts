import { Database } from "../db/db.ts";
import { CurrencyRateSourceRepository } from "../db/repositories/currencyRateSource.repository.ts";
import { CurrencyNotFoundError } from "../db/services/currency.service.ts";
import { CurrencyRateSourceService, ExecuteCurrencyRateSourceError } from "../db/services/currencyRateSource.service.ts";
import { UserNotFoundError } from "../db/services/user.service.ts";
import { ExtendedLogger } from "../debug/extendedLog.ts";
import { CronService } from "./cronService.ts";
import { QUERY_IGNORE } from "../symbols.ts";
import { GlobalCurrencyCache } from "../db/caches/currencyListCache.cache.ts";
import { GlobalCurrencyToBaseRateCache } from "../db/caches/currencyToBaseRate.cache.ts";
import { GlobalCurrencyRateDatumsCache } from "../db/caches/currencyRateDatumsCache.cache.ts";

export class CurrencyRatesCRON implements CronService
{
    #logger: ExtendedLogger | null = null;
    #isRunning = false;
    mainIntervalId: number | null = null;

    private constructor() {  }

    public static create(logger: ExtendedLogger): CurrencyRatesCRON
    {
        const newCRON = new CurrencyRatesCRON();
        newCRON.#logger = logger;
        newCRON.#logger?.logCyan(`Initializing currency rates CRON.`);
        newCRON.#logger?.logCyan(`Initialized currency rates CRON.`);
        return newCRON;
    }

    start(): void
    {
        this.#isRunning = true;
        this.#logger?.logCyan(`Starting currency rates CRON.`);
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

                    this.#logger?.logCyan(`Fetching rate of ticker='${currency.ticker}', hostname='${fullRateSrc.hostname}', path='${fullRateSrc.path}' using source name='${src.name}'`);

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
                        this.#logger?.logCyan(`Error fetching ticker='${currency.ticker}', hostname='${fullRateSrc.hostname}', path='${fullRateSrc.path}': ${fetchResult.message}`);
                        if (fetchResult.error instanceof CurrencyNotFoundError) continue;
                        if (fetchResult.error instanceof UserNotFoundError) continue;
                        if (fetchResult.error instanceof UserNotFoundError) continue;
                        continue;
                    }
                    else
                    {
                        await transactionContext.endSuccess();
                        this.#logger?.logGreen(`Successfully fetched latest rate of ${currency.ticker} (id='${currency.id}').`);
                        break;
                    }
                }
            }
        }, 10000);

        this.#logger?.logCyan(`Started currency rates CRON.`);
    }

    async stop(): Promise<void> {
        this.#isRunning = false;
        this.#logger?.logCyan(`Stopping currency rates CRON.`);
        await new Promise<void>(resolve => resolve());
        this.#logger?.logCyan(`Stopped currency rates CRON.`);
    }

    getIsRunning() { return this.#isRunning; }

    destroy(): Promise<void> | void
    {
        if (this.mainIntervalId !== null)
            clearInterval(this.mainIntervalId);
    }
}