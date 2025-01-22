import { CurrencyRatesCRON } from "./currencyRates.cron.ts";
import { ExtendedLogger } from '../debug/extendedLog.ts';

export interface CronService
{
    start(): Promise<void> | void;
    stop(): Promise<void> | void;
    destroy(): Promise<void> | void;
    getIsRunning(): boolean;
};

export class CronRunner
{
    #crons: CronService[] = [];
    #logger: ExtendedLogger;

    public constructor(logger: ExtendedLogger)
    {
        this.#logger = logger;
    }

    public async initAll(): Promise<void>
    {
        this.#crons.push(CurrencyRatesCRON.create(this.#logger));
    }

    public async startAll(): Promise<void>
    {
        await Promise.all(this.#crons.map(x => x.start()));
    }

    public async stopAll(): Promise<void>
    {
        await Promise.all(this.#crons.map(x => x.stop()));
    }

    public async destroyAll(): Promise<void>
    {
        await Promise.all(this.#crons.map(x => x.destroy()));
    }
}