import chalk from 'chalk';
import { TestCaseTimeoutError } from './assert.js';

export type ContextConfig =
{
    onStart?: () => Promise<void>;
    onEnd?: () => Promise<void>;
    contextChain: Context[];
}

export type TestConfig =
{
    timeout?: number
}

export class Context
{
    public name: string;
    public level = 0;
    public errors = [] as {name: string, err: Error}[];
    public testsCount = 0;
    public successfulCount = 0;
    public failedCount = 0;

    public constructor(name: string) { this.name = name; }

    public clearLastLine()
    {
        process.stdout.moveCursor(0, -1) // up one line
        process.stdout.clearLine(1) // from cursor to end
    }

    public getLevelPadding(offset = 0)
    { 
        if (this.level + offset === 0) return '';
        return new Array((this.level + offset)).fill('   ').join('');
    }

    public log(arg: any, offset = 0)
    {
        process.stdout.write(this.getLevelPadding(offset));
        console.log(arg);
    }

    private constructBinding(this:this)
    {
        return { 
            describe: this.describe.bind(this), 
            test: this.test.bind(this) ,
            log: this.log.bind(this)
        } as {
            "describe": (name: string, fn: (this: Context) => Promise<void> ) => Promise<void>
        };
    }

    public async describe(name: string, fn: (this: Context) => Promise<void>)
    {
        this.log(chalk.cyan(`${name}:`));
        this.level++;
        try 
        {
            await new Promise<void>((function (this: Context, resolve: () => any, reject: (err: Error) => any)
            {
                (function () 
                {
                    fn.bind(this)().then(() => resolve()).catch(e =>
                    {
                        reject(e);
                    });
                }).bind(this)();
            }).bind(this.constructBinding.bind(this)()));
        }
        catch(e) { this.errors.push({name: name, err: e}); }
        this.level--;
    }

    public async test(name: string, fn: (this: Context) => Promise<void>, config = undefined as undefined | TestConfig)
    {
        const defaultTimeout = 2000;
        let self = this;
        
        const startDate = new Date().getTime();
        this.level++;
        this.testsCount++;
        let isError = false;
        try 
        {
            await new Promise<void>((function (this: Context, resolve: () => any, reject: (err: Error) => any)
            {
                (function () 
                {
                    let timeoutTimer = config?.timeout === 0 ? undefined : setTimeout(function()
                    {
                        reject(new TestCaseTimeoutError(config?.timeout ?? defaultTimeout));
                    }, config?.timeout ?? defaultTimeout);

                    fn.bind(this)().then(() =>
                    {
                        resolve();
                        if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
                    })
                    .catch((e: Error) =>
                    {
                        reject(e);
                        if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
                    });
                }).bind(this)();
            }).bind(this.constructBinding.bind(this)()));
            self.successfulCount++;
        }
        catch(e) 
        { 
            self.failedCount++;
            this.errors.push({name: name, err: e}); isError = true; 
        }
        this.level--;
        const endDate = new Date().getTime();

        // Print test case result
        (function () 
        {
            let colorMethod = chalk[isError ? 'red' : 'green'];
            let tagContent = (chalk[isError ? "bgRed" : "bgGreen"]).black(isError ? ' FAIL ' : ' PASS ');
            this.log(colorMethod(`${tagContent} ${name} (${endDate - startDate} ms)`), -1)
        }).bind(this)();
    }
}