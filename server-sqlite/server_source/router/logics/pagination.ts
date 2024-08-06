import { IsNumber, IsArray, IsOptional, IsNumberString } from "class-validator";
import type { PaginationAPIResponse } from "../../../../api-types/lib.js";

export class PaginationAPIResponseClass<T> implements PaginationAPIResponse<T>
{
    @IsNumber() totalItems: number;
    @IsNumber() startingIndex: number;
    @IsNumber() endingIndex: number;
    @IsArray() rangeItems: T[];
}

export class PaginationAPIQueryRequest
{
    @IsNumberString() start?: string | undefined; 
    @IsNumberString() end?: string | undefined; 
}

export class OptionalPaginationAPIQueryRequest
{
    @IsOptional() @IsNumberString() start?: string | undefined; 
    @IsOptional() @IsNumberString() end?: string | undefined; 
}