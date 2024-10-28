import { MonadError } from "./monadError.js";

export class DirNotFoundError extends MonadError<typeof DirNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    path: string;

    constructor(path: string)
    {
        super(DirNotFoundError.ERROR_SYMBOL, `The given path is not a directory, or is not found: ${path}`);
        this.name = this.constructor.name;
        this.path = path;
    }
}

export class FileNotFoundError extends MonadError<typeof FileNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    path: string;

    constructor(path: string)
    {
        super(FileNotFoundError.ERROR_SYMBOL, `The given path is not a file, or is not found: ${path}`);
        this.name = this.constructor.name;
        this.path = path;
    }
}