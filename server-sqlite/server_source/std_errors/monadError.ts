import chalk from "chalk";
import { get, StackFrame } from "stack-trace";
import type { NoUnion } from "../index.d.ts";
import process from "node:process";

export class MonadError<T extends symbol> extends Error
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

    public unwrapErrorChain(): (Error | MonadError<symbol>)[]
    {
        const output: (Error | MonadError<symbol>)[] = [];

        // deno-lint-ignore no-this-alias
        let current: Error | MonadError<symbol> = this;

        for (let i = 0; i < 999; i++)
        {
            if (!isNestableError(current)) return output;
            output.push(current.error);
            current = current.error;
        }

        return output;
    }

    public panic()
    {
        let msg = ``;
        msg += `\n${chalk.red(this)}`;
        const chain: (Error | MonadError<symbol>)[] = [this, ...this.unwrapErrorChain()];
        for (const chainItem of chain)
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
export function unwrap<T extends NoUnion<symbol>, V>(errOrValue: MonadError<T> | V, msg?: string): V
{
    if (errOrValue instanceof MonadError) throw panic(msg ?? "");
    return errOrValue;
}

/** Given a monad error, panic if it is an error, return the value as is if it is not. */
export function unwrapAny<T extends symbol, V>(errOrValue: MonadError<T> | V, msg?: string): V
{
    if (errOrValue instanceof MonadError) throw panic(msg ?? "");
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
    error: Error | MonadError<symbol>;
}

export function isNestableError(target: object): target is NestableError
{
    // @ts-expect-error NestableErrorSymbol should be present in target to be nestable
    if (target[NestableErrorSymbol]) return true;
    return false;
}