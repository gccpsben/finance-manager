import { PaginationAPIResponse } from "./lib";

export type CurrencyDTO = 
{
    id: string;
    name: string;
    fallbackRateAmount: string | undefined;
    fallbackRateCurrencyId: string | undefined;
    owner: string;
    isBase: boolean;
    ticker: string;
    rateToBase: string; // a DecimalJS string
};

export namespace PostCurrencyAPI 
{
    export type ResponseDTO = { id: string; };
    export type RequestDTO = 
    {
        name: string;
        fallbackRateAmount: string | undefined;
        fallbackRateCurrencyId: string | undefined;
        ticker: string;
    };
}

export namespace GetCurrencyAPI
{
    export type ResponseDTO = PaginationAPIResponse<CurrencyDTO>;
    export type RequestDTO = { };
}

export namespace GetCurrencyRateHistoryAPI
{
    export type ResponseDTO = {};
}