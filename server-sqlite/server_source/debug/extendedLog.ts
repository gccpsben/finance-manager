
import chalk from 'chalk';
import * as fse from 'fs-extra/esm';
import path from 'node:path';
import { createStream, RotatingFileStream } from 'rotating-file-stream';
import { EnvManager } from '../env.ts';

// let pastLines:any = [];

export class ExtendedLog
{
    public static writeStream: RotatingFileStream;

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

    private static async ensureWriteStream()
    {
        if (ExtendedLog.writeStream) return;
        if (!EnvManager.logsFolderPath) throw new Error(`ensureWriteStream: EnvManager.logsFolderPath is not defined.`);

        fse.mkdirs(EnvManager.logsFolderPath);
        ExtendedLog.writeStream = createStream
        (
            (time: Date, index: number) =>
            {
                return path.join(EnvManager.logsFolderPath!, ExtendedLog.generateLogFileName(time, index));
            },
            {
                interval: '1M'
            }
        );
    }

    private static async logToFile(msg: string)
    {
        await ExtendedLog.ensureWriteStream();
        // we want to support multi-line error, and the preserve the error format too: [DATE_TIME] [ERROR]
        const lines = msg.split("\n");
        const linePrefix = `[${ExtendedLog.formatDateTime(new Date())}]`;
        for (const line of lines) ExtendedLog.writeStream.write(`\n${linePrefix} ${line}`);
    }

    public static async log(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(arg);
    }

    public static async logGray(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.dim.gray(`${arg}`));
    }

    public static async logGreen(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.green(`${arg}`));
    }

    public static async logRed(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.red(`${arg}`));
    }

    public static async logYellow(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.yellow(`${arg}`));
    }

    public static async logCyan(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.cyan(`${arg}`));
    }

    public static async logMagenta(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.magenta(`${arg}`));
    }

    public static async logBlue(arg:any, logToFile=true, logToConsole=true)
    {
        if (logToFile) ExtendedLog.logToFile(`${arg}`);
        if (logToConsole) console.log(chalk.blue(`${arg}`));
    }
}