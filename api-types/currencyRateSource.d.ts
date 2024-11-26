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

export namespace PatchCurrencyRateSrcAPI
{
    export type RequestDTO =
    {
        id: string;
        refAmountCurrencyId: string;
        hostname: string;
        path: string;
        jsonQueryString: string;
        name: string;
    };

    export type ResponseDTO = GetCurrencyRateSrcAPI.ResponseCurrencyRateSrcDTO;
}

export namespace GetCurrencyRateSrcBySrcIdAPI
{
    export type Path<CurrencyRateSrcId extends string> = `/api/v1/currencyRateSources/${CurrencyRateSrcId}`;
    export type ResponseCurrencyRateSrcDTO = GetCurrencyRateSrcAPI.ResponseCurrencyRateSrcDTO;
    export type RequestDTO = { };
    export type ResponseDTO = ResponseCurrencyRateSrcDTO;
}

export namespace GetCurrencyRateSrcAPI
{
    export type Path<CurrencyId extends string> = `/api/v1/${CurrencyId}/currencyRateSources`;
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
    export type RequestDTO = { };
    export type ResponseDTO = { sources: ResponseCurrencyRateSrcDTO[]; };
}