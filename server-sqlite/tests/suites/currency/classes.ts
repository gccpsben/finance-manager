import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, ValidateNested } from "class-validator";
import { IsDecimalJSString } from "../../../server_source/db/validators.ts";
import { CurrencyDTO, PostCurrencyAPI, GetCurrencyAPI, GetCurrencyRateHistoryAPI } from "../../../../api-types/currencies.d.ts";
import { PostCurrencyRateAPI } from "../../../../api-types/currencyRateDatum.d.ts";
import { Type } from "class-transformer";

export class CurrencyDTOClass implements CurrencyDTO
{
    @IsString() id: string;
    @IsString() name: string;
    @IsOptional() @IsDecimalJSString() fallbackRateAmount: string;
    @IsOptional() @IsString() fallbackRateCurrencyId: string;
    @IsString() owner: string;
    @IsBoolean() isBase: boolean;
    @IsString() ticker: string;
    @IsDecimalJSString() rateToBase: string;
}

export namespace GetCurrencyAPIClass
{
    export class ResponseDTO implements GetCurrencyAPI.ResponseDTO
    {
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => CurrencyDTOClass)
        rangeItems: CurrencyDTO[];
    }
}

export namespace PostCurrencyAPIClass
{
    export class RequestDTO implements PostCurrencyAPI.RequestDTO
    {
        @IsString() name: string;
        @IsOptional() @IsDecimalJSString() fallbackRateAmount: string;
        @IsOptional() @IsString() fallbackRateCurrencyId: string;
        @IsString() ticker: string;
    }

    export class ResponseDTO implements PostCurrencyAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

export namespace PostCurrencyRateDatumAPIClass
{
    export class RequestItemDTO implements PostCurrencyRateAPI.RequestItemDTO
    {
        @IsDecimalJSString() amount: string;
        @IsString() refCurrencyId: string;
        @IsString() refAmountCurrencyId: string;
        @IsNumber() date: number;
    }
    export class RequestDTO implements PostCurrencyRateAPI.RequestDTO
    {
        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => RequestItemDTO)
        datums: PostCurrencyRateAPI.RequestItemDTO[];
    }
    export class ResponseDTO implements PostCurrencyRateAPI.ResponseDTO
    {
        @IsString({ each: true }) ids: string[];
    }
}

export namespace GetCurrencyRatesHistoryAPIClass
{
    export class RateDatumDTO implements GetCurrencyRateHistoryAPI.RateDatum
    {
        @IsNumber() date: number;
        @IsDecimalJSString() value: string;
    }

    export class RequestQueryDTO implements GetCurrencyRateHistoryAPI.RequestQueryDTO
    {
        @IsString() id: string;
        @IsOptional() @IsDecimalJSString() startDate?: string;
        @IsOptional() @IsDecimalJSString() endDate?: string;
    }

    export class ResponseDTO implements GetCurrencyRateHistoryAPI.ResponseDTO
    {
        @IsOptional() @IsDecimalJSString() startDate: number;
        @IsOptional() @IsDecimalJSString() endDate: number;
        @IsBoolean() historyAvailable: boolean;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => RateDatumDTO)
        datums: GetCurrencyRateHistoryAPI.RateDatum[];
    }
}