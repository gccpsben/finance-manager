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