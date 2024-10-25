export namespace PostCurrencyRateAPI
{
    export type RequestDTO =
    {
        amount: string;
        refCurrencyId: string;
        refAmountCurrencyId: string;
        date: number;
    };
    export type ResponseDTO = { id: string; };
}