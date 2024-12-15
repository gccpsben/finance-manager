export namespace GetExpensesAndIncomesAPI
{
    export type RequestQueryDTO =
    {
        currentMonthStartEpoch: string;
        currentWeekStartEpoch: string;
    };

    export type ResponseDTO =
    {
        expenses30d: string;
        incomes30d: string;
        expenses7d: string;
        incomes7d: string
        expensesCurrentWeek: string;
        incomesCurrentWeek: string
        expensesCurrentMonth: string;
        incomesCurrentMonth: string
    };
}

export namespace GetUserBalanceHistoryAPI
{
    export type Path<Params extends string> = `/api/v1/calculations/balanceHistory${Params}`;

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
    export type Path<Params extends string> = `/api/v1/calculations/networthHistory${Params}`;

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