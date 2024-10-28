import { IsNumber, IsArray, IsOptional, IsNumberString } from "class-validator";
import type { PaginationAPIResponse } from "../../../api-types/lib.js";
import { SQLitePrimitiveOnly } from "../index.d.js";

export class PaginationAPIResponseClass<T> implements PaginationAPIResponse<T>
{
    @IsNumber() totalItems: number;
    @IsNumber() startingIndex: number;
    @IsNumber() endingIndex: number;
    @IsArray() rangeItems: T[];

    public static async prepareFromQueryItems<T extends object>
    (
        queriedItems:
        {
            totalCount: number,
            rangeItems: SQLitePrimitiveOnly<T>[]
        },
        userQueryStartIndex: number | undefined
    )
    {
        const response: PaginationAPIResponseClass<SQLitePrimitiveOnly<T>> = await (async () =>
        {
            const output = new PaginationAPIResponseClass<SQLitePrimitiveOnly<T>>();
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