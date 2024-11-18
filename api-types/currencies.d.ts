import { PaginationAPIResponse } from "./lib";

export type CurrencyDTO =
{
    id: string;
    name: string;
    fallbackRateAmount: string | null;
    fallbackRateCurrencyId: string | null;
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
        fallbackRateAmount: string | null;
        fallbackRateCurrencyId: string | null;
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
    export type RateDatum =
    {
        date: number;
        value: string;
    }

    export type RequestQueryDTO =
    {
        id: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
    };

    export type ResponseDTO =
    {
        startDate: number | undefined;
        endDate: number | undefined;
        datums: RateDatum[];
        historyAvailable: boolean; // If will be false if there's no enough data
    };
}