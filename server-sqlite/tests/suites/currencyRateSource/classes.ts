// deno-lint-ignore-file no-namespace
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { DeleteCurrencyRateSrcAPI, GetCurrencyRateSrcAPI, PostCurrencyRateSrcAPI } from "../../../../api-types/currencyRateSource.d.ts";
import { Type } from "class-transformer";

export namespace DeleteCurrencyRateSrcAPIClass
{
    export class ResponseDTO implements DeleteCurrencyRateSrcAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

export namespace GetCurrencyRateSrcAPIClass
{
    export class RequestDTO implements GetCurrencyRateSrcAPI.RequestDTO
    {
        @IsString()
        targetCurrencyId: string;
    }

    export class ResponseCurrencyRateSrcDTO implements GetCurrencyRateSrcAPI.ResponseCurrencyRateSrcDTO
    {
        @IsString() refCurrencyId: string;
        @IsString() refAmountCurrencyId: string;
        @IsString() hostname: string;
        @IsString() path: string;
        @IsString() jsonQueryString: string;
        @IsString() name: string;
        @IsString() id: string;
        @IsNumber() @IsOptional() lastExecuteTime: number;
    }

    export class ResponseDTO implements GetCurrencyRateSrcAPI.ResponseDTO
    {
        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => ResponseCurrencyRateSrcDTO)
        sources: ResponseCurrencyRateSrcDTO[];
    }
}

export namespace PostCurrencyRateSourceAPIClass
{
    export class RequestDTO implements PostCurrencyRateSrcAPI.RequestDTO
    {
        @IsString() refCurrencyId: string;
        @IsString() refAmountCurrencyId: string;
        @IsString() hostname: string;
        @IsString() path: string;
        @IsString() jsonQueryString: string;
        @IsString() name: string;
    }
    export class ResponseDTO implements PostCurrencyRateSrcAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}