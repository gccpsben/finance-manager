import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber } from "class-validator";
import { IsDecimalJSString, IsUTCDateInt } from "../../../server_source/db/validators.js";
import { GetTxnAPI, PostTxnAPI, PutTxnAPI } from "../../../../api-types/txn.js";
import { Type } from "class-transformer";

export namespace GetTxnAPIClass
{
    export class TxnDTOClass implements GetTxnAPI.TxnDTO
    {
        @IsString() id: string;
        @IsString() title: string;
        @IsOptional() @IsString() description: string;
        @IsString() owner: string;
        @IsOptional() @IsUTCDateInt()  creationDate: number;
        @IsArray() tagIds: string[];
        @IsOptional() @IsDecimalJSString() fromAmount: string;
        @IsOptional() @IsString() fromCurrency: string;
        @IsOptional() @IsString() fromContainer: string;
        @IsOptional() @IsDecimalJSString() toAmount: string;
        @IsOptional() @IsString() toCurrency: string;
        @IsOptional() @IsString() toContainer: string;
    }

    export class ResponseDTOClass implements GetTxnAPI.ResponseDTO
    {
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => TxnDTOClass)
        rangeItems: GetTxnAPI.TxnDTO[];
    }
}

export namespace PostTxnAPIClass
{
    export class RequestDTOClass implements PostTxnAPI.RequestDTO
    {
        @IsString() @IsNotEmpty() title: string;
        @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
        @IsOptional() @IsString() description?: string | undefined;
        @IsArray() tagIds: string[];
        @IsOptional() @IsDecimalJSString() fromAmount?: string | undefined;
        @IsOptional() @IsString() fromContainerId?: string | undefined;
        @IsOptional() @IsString() fromCurrencyId?: string | undefined;
        @IsOptional() @IsDecimalJSString() toAmount?: string | undefined;
        @IsOptional() @IsString() toContainerId?: string | undefined;
        @IsOptional() @IsString() toCurrencyId?: string | undefined;
    }

    export class ResponseDTOClass implements PostTxnAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

export namespace PutTxnAPIClass
{
    export class RequestBodyDTOClass implements PutTxnAPI.RequestBodyDTO
    {
        @IsString() @IsNotEmpty() title: string;
        @IsOptional() @IsUTCDateInt() creationDate?: number | undefined;
        @IsOptional() @IsString() description?: string | undefined;
        @IsArray() tagIds: string[];
        @IsOptional() @IsDecimalJSString() fromAmount?: string | undefined;
        @IsOptional() @IsString() fromContainerId?: string | undefined;
        @IsOptional() @IsString() fromCurrencyId?: string | undefined;
        @IsOptional() @IsDecimalJSString() toAmount?: string | undefined;
        @IsOptional() @IsString() toContainerId?: string | undefined;
        @IsOptional() @IsString() toCurrencyId?: string | undefined;
    }

    export class RequestQueryDTOClass implements PutTxnAPI.RequestQueryDTO
    {
        @IsString() targetTxnId: string;
    }
}
