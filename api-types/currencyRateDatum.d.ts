export namespace PostCurrencyRateAPI
{
    export type RequestDTO =
    {
        datums: RequestItemDTO[]
    };
    export type RequestItemDTO =
    {
        amount: string;
        refCurrencyId: string;
        refAmountCurrencyId: string;
        date: number;
    };
    export type ResponseDTO = { ids: string[]; };
}