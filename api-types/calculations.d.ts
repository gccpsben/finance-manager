export type GetExpensesAndIncomesDTO = { };
export type ResponseGetExpensesAndIncomesDTO = 
{
    expensesTotal: string;
    incomesTotal: string;
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