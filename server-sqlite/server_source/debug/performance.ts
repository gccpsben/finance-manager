import chalk from "chalk";

export class TimeDiffer
{
    public startDate: Date;
    public prefix: string | undefined;
    public isLapseMode = false;
    private lastMarkTime: Date;
    private lapseCount = 0;

    public constructor(prefix? : string | undefined, isLapseMode = false)
    {
        this.startDate = new Date();
        this.prefix = prefix;
        this.isLapseMode = isLapseMode;
        this.lastMarkTime = new Date();
    }

    public mark(prefix?: string | undefined)
    {
        const now = Date.now();

        if (!this.isLapseMode)
            console.log(chalk.red(`${prefix || this.prefix}${now - this.startDate.getTime()}`));
        else
            console.log(chalk.red(`${prefix || this.prefix}(Lapse:${this.lapseCount}) ${now - this.lastMarkTime.getTime()}`));

        this.lastMarkTime = new Date(now);
        if (this.isLapseMode) this.lapseCount++;
    }
}