import chalk from "chalk";
import { get, StackFrame } from "stack-trace";
import type { NoUnion } from "../index.d.js";

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
        let msg = ``;
        msg += `\n${chalk.red(this)}`;
        const chain: (Error | MonadError<any>)[] = [this, ...this.unwrapErrorChain()];
        for (let chainItem of chain)
        {
            if (chainItem instanceof MonadError) msg += "\n" + chainItem.#stackFrame.join("\n  > ");
            else if (chainItem instanceof Error) msg += "\n" + chalk.red(chainItem);
        }
        panic(msg);
    }
}

/**
 * Given a monad error, panic if it is an error, return the value as is if it is not.
 * This function disallows using union as the generic parameter T.
 * If you need to catch all errors, use ``unwrapAny``.
 * */
export function unwrap<T extends NoUnion<Symbol>, V>(errOrValue: MonadError<T> | V, msg?: string)
{
    if (errOrValue instanceof MonadError) return void(panic(msg));
    return errOrValue;
}

/** Given a monad error, panic if it is an error, return the value as is if it is not. */
export function unwrapAny<T extends Symbol, V>(errOrValue: MonadError<T> | V, msg?: string)
{
    if (errOrValue instanceof MonadError) return void(panic(msg));
    return errOrValue;
}

export function panic(msg: string)
{
    console.error(`Server panic:\n`);
    console.error(chalk.red(msg));
    process.exit(-1);
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