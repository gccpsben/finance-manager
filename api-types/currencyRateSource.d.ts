export namespace PostCurrencyRateSrcAPI
{
    export type RequestDTO =
    {
        refCurrencyId: string;
        refAmountCurrencyId: string;
        hostname: string;
        path: string;
        jsonQueryString: string;
        name: string;
    };

    export type ResponseDTO = { id: string; };
}

export namespace GetCurrencyRateSrcAPI
{
    export type ResponseCurrencyRateSrcDTO =
    {
        refCurrencyId: string;
        refAmountCurrencyId: string;
        hostname: string;
        path: string;
        jsonQueryString: string;
        name: string;
        id: string;
        lastExecuteTime: number | null;
    };

    export type RequestDTO = { targetCurrencyId: string; };
    export type ResponseDTO =
    {
        sources: ResponseCurrencyRateSrcDTO[];
    };
}