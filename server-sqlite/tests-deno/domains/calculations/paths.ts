import { GetExpensesAndIncomesAPI, GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI } from "../../../../api-types/calculations.d.ts";

export const GET_EXPENSES_AND_INCOMES_API_PATH =
(
    { currentWeekStartEpoch, currentMonthStartEpoch } :
    { currentWeekStartEpoch?: number, currentMonthStartEpoch?: number }
) =>
{
    const params = new URLSearchParams(
    {
        ... currentWeekStartEpoch === undefined ? {} : { currentWeekStartEpoch: `${currentWeekStartEpoch}` },
        ... currentMonthStartEpoch === undefined ? {} : { currentMonthStartEpoch: `${currentMonthStartEpoch}` },
    }).toString();
    const query = params === '' ? '' : `?${params}`;

    return `/api/v1/calculations/expensesAndIncomes${query}` satisfies
        GetExpensesAndIncomesAPI.Path<string>;
};

export const GET_BALANCE_HISTORY_API_PATH =
(
    { startDate, endDate, division } :
    { startDate?: number, endDate?: number, division?: number }
) =>
{
    const params = new URLSearchParams(
    {
        ... startDate === undefined ? {} : { startDate: `${startDate}` },
        ... endDate === undefined ? {} : { endDate: `${endDate}` },
        ... division === undefined ? {} : { division: `${division}` }
    }).toString();
    const query = params === '' ? '' : `?${params}`;

    return `/api/v1/calculations/balanceHistory${query}` satisfies
        GetUserBalanceHistoryAPI.Path<string>;
};
export const GET_NETWORTH_HISTORY_API_PATH =
(
    { startDate, endDate, division } :
    { startDate?: number, endDate?: number, division?: number }
) =>
{
    const params = new URLSearchParams(
    {
        ... startDate === undefined ? {} : { startDate: `${startDate}` },
        ... endDate === undefined ? {} : { endDate: `${endDate}` },
        ... division === undefined ? {} : { division: `${division}` }
    }).toString();
    const query = params === '' ? '' : `?${params}`;

    return `/api/v1/calculations/networthHistory${query}` satisfies
        GetUserNetworthHistoryAPI.Path<string>;
};