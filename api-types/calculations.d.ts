export type GetExpensesAndIncomesDTO = { };
export type ResponseGetExpensesAndIncomesDTO = 
{
    expenses30d: string;
    incomes30d: string;
    expenses7d: string;
    incomes7d: string
};

export namespace GetUserBalanceHistoryAPI
{
    export type RequestQueryDTO = 
    {
        startDate: string | undefined;
        endDate: string | undefined;
        division: string | undefined;
    };

    export type ResponseDTO = 
    { 
        map: 
        { 
            [epoch: string]: { [currencyId: string]: string } 
        };
    };
}

export namespace GetUserNetworthHistoryAPI
{
    export type RequestQueryDTO = 
    {
        startDate: string | undefined;
        endDate: string | undefined;
        division: string | undefined;
    };

    export type ResponseDTO = 
    {
        map: 
        {
            [epoch: string]: string
        }
    };
}