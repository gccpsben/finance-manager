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

    public unwrapErrorChain(): (Error | MonadError<any>)[]
    {
        const output: (Error | MonadError<any>)[] = [];
        let current: Error | MonadError<any> = this;

        for (let i = 0; i < 999; i++)
        {
            if (!isNestableError(current)) return output;
            output.push(current.error);
            current = current.error;
        }
    }

    public panic()
    {
        console.error(`Server panic:\n ${chalk.red(this)}`);
        const chain: (Error | MonadError<any>)[] = [this, ...this.unwrapErrorChain()];
        for (let chainItem of chain)
        {
            if (chainItem instanceof MonadError) console.error(chalk.red(chainItem.#stackFrame.join("\n  > ")));
            else if (chainItem instanceof Error) console.error(chalk.red(chainItem));
        }
        process.exit(-1);
    }
}

export const NestableErrorSymbol: unique symbol = Symbol();

export interface NestableError
{
    [NestableErrorSymbol]: true;
    error: Error | MonadError<any>;
}

export function isNestableError(target: any): target is NestableError
{
    if (target[NestableErrorSymbol]) return true;
    return false;
}