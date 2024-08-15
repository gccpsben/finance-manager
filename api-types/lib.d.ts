export type PaginationAPIResponse<T> = 
{
    totalItems: number;
    startingIndex: number;
    endingIndex: number;
    rangeItems: T[];
};

export type Exact<Actual, Expected> = Actual extends Expected ? (Expected extends Actual ? Actual : never) : never;