export type PostCurrencyDTO = 
{
    name: string;
    amount: string | undefined;
    refCurrencyId: string | undefined;
    ticker: string;
};
export type ResponsePostCurrencyDTO = { id: string; };
export type GetCurrencyDTO = { };
export type ResponseGetCurrencyDTO = 
{
    id: string;
    name: string;
    amount: string | undefined;
    refCurrency: string | undefined;
    owner: string;
    isBase: boolean;
    ticker: string;
    rateToBase: string; // a DecimalJS string
}[];