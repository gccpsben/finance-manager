import { CurrencyRatesCRON } from "./currencyRates.cron.ts";

export interface CronService
{
    init(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getIsRunning(): boolean;
};

export class CronRunner
{
    #crons: CronService[] = [];

    public async initAll(): Promise<void>
    {
        this.#crons.push(new CurrencyRatesCRON());
        await Promise.all(this.#crons.map(x => x.init()));
    }

    public async startAll(): Promise<void>
    {
        await Promise.all(this.#crons.map(x => x.start()));
    }

    public async stopAll(): Promise<void>
    {
        await Promise.all(this.#crons.map(x => x.stop()));
    }
}