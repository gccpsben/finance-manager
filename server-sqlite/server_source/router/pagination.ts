import { IsNumber, IsArray, IsOptional, IsNumberString } from "class-validator";
import type { PaginationAPIResponse } from "../../../api-types/lib.d.ts";

export class PaginationAPIResponseClass<T> implements PaginationAPIResponse<T>
{
    @IsNumber() totalItems: number;
    @IsNumber() startingIndex: number;
    @IsNumber() endingIndex: number;
    @IsArray() rangeItems: T[];

    public static async prepareFromQueryItems<T>
    (
        queriedItems:
        {
            totalCount: number,
            rangeItems: T[]
        },
        userQueryStartIndex: number | undefined
    )
    {
        const response: PaginationAPIResponseClass<T> = await (async () =>
        {
            const output = new PaginationAPIResponseClass<T>();
            output.startingIndex = userQueryStartIndex ?? 0;
            output.endingIndex = (userQueryStartIndex ?? 0) + queriedItems.rangeItems.length - 1;
            output.rangeItems = queriedItems.rangeItems;
            output.totalItems = queriedItems.totalCount;
            return output;
        })();
        return response;
    }
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