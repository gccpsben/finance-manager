export type PaginationAPIResponse<T> = 
{
    totalItems: number;
    startingIndex: number;
    endingIndex: number;
    rangeItems: T[];
};