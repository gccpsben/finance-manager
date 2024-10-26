import chalk from "chalk";
import { get, StackFrame } from "stack-trace";

export class MonadError<T extends Symbol> extends Error
{
    #errorSymbol: T;
    #stackFrame: StackFrame[] = [];

    public getStackFrame()
    {
        return this.#stackFrame;
    }

    constructor(symbol: T, msg: string)
    {
        super(msg);
        this.#stackFrame = get();
        this.#errorSymbol = symbol;
    }

    public panic()
    {
        console.error(`Server panic:\n ${chalk.red(this)}`);
        console.error(chalk.red(this.#stackFrame.join("\n  > ")));
        process.exit(-1);
    }
}