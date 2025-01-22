
import chalk from 'chalk';
import * as fse from 'fs-extra/esm';
import path from 'node:path';
import { createStream, RotatingFileStream } from 'rotating-file-stream';
import { EnvManager } from '../env.ts';

// let pastLines:any = [];

export class ExtendedLogger
{
    public writeStream: RotatingFileStream | null;

    public constructor()
    {
        if (!EnvManager.logsFolderPath) throw new Error(`ensureWriteStream: EnvManager.logsFolderPath is not defined.`);

        fse.mkdirs(EnvManager.logsFolderPath);
        this.writeStream = createStream
        (
            (time: number | Date, index?: number) =>
            {
                const date = typeof time === 'number' ? new Date(time) : time;
                return path.join(EnvManager.logsFolderPath!, ExtendedLogger.generateLogFileName(date, index ?? 0));
            },
            {
                interval: '1M'
            }
        );
    }

    private static formatDateTime(time: Date)
    {
        const year = time.getFullYear().toString().padStart(4, '0');
        const month = (time.getMonth() + 1).toString().padStart(2, '0');
        const day = time.getDate().toString().padStart(2, '0');
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        const seconds = time.getSeconds().toString().padStart(2, '0');
        const ms = time.getMilliseconds().toString().padStart(4, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
    }

    public static generateLogFileName(time: Date, index: number)
    {
        const dateTime = time ?? new Date();
        const pad = (num: number) => (num > 9 ? "" : "0") + num;
        const year = dateTime.getFullYear();
        const month = pad(dateTime.getMonth() + 1);

        return `${year}-${month}-(${index ?? 0}).log`;
    }

    private logToFile(msg: string)
    {
        // we want to support multi-line error, and the preserve the error format too: [DATE_TIME] [ERROR]
        const lines = msg.split("\n");
        const linePrefix = `[${ExtendedLogger.formatDateTime(new Date())}]`;
        if (this.writeStream)
            for (const line of lines) this.writeStream.write(`\n${linePrefix} ${line}`);
    }

    public log(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) this.logToFile(`${arg}`);
        if (logToConsole) console.log(arg);
    }

    public async logGray(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) await this.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.dim.gray(`${arg}`));
    }

    public logGreen(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) this.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.green(`${arg}`));
    }

    public logRed(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) this.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.red(`${arg}`));
    }

    public logYellow(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) this.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.yellow(`${arg}`));
    }

    public logCyan(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) this.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.cyan(`${arg}`));
    }

    public logMagenta(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) this.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.magenta(`${arg}`));
    }

    public logBlue(arg: unknown, logToFile=true, logToConsole=true)
    {
        if (logToFile) this.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.blue(`${arg}`));
    }

    public shutdown()
    {
        this.writeStream?.destroy();
    }
}