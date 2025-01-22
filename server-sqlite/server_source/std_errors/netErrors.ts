import { MonadError } from "./monadError.ts";

export class FetchError extends MonadError<typeof FetchError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    method: string;
    url: string;
    res: Response;

    constructor(method: string, url: string, res: Response)
    {
        super(FetchError.ERROR_SYMBOL, `Error occurred during ${method} of ${url}: ${res.statusText}.`);
        this.name = this.constructor.name;
        this.res = res;
        this.url = url;
        this.method = method;
    }
}