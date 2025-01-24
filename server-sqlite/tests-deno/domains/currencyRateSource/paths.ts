import { GetCurrencyRateSrcAPI, GetCurrencyRateSrcBySrcIdAPI } from "../../../../api-types/currencyRateSource.d.ts";

export const POST_CURRENCY_RATE_SRC_API_PATH = `/api/v1/currencyRateSources`;

export const GET_CURRENCY_RATE_SRC_API_PATH = <T extends string>(cid: T) =>
    `/api/v1/${cid}/currencyRateSources` satisfies GetCurrencyRateSrcAPI.Path<T>;

export const GET_CURRENCY_RATE_SRC_BY_ID_API_PATH = <T extends string>(sid: T) =>
    `/api/v1/currencyRateSources/${sid}` satisfies GetCurrencyRateSrcBySrcIdAPI.Path<T>;