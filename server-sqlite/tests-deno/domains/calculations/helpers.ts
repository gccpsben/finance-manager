import path from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { GetExpensesAndIncomesAPIClass, GetUserBalanceHistoryAPIClass, GetUserNetworthHistoryAPIClass } from "./classes.ts";
import { GET_BALANCE_HISTORY_API_PATH, GET_EXPENSES_AND_INCOMES_API_PATH } from './paths.ts';
import { getTestServerPath } from "../../init.ts";
import { GET_NETWORTH_HISTORY_API_PATH } from './paths';

export const createGetExpensesAndIncomesFunc =
(
    { currentWeekStartEpoch, currentMonthStartEpoch } :
    {
        currentWeekStartEpoch?: number,
        currentMonthStartEpoch?: number,
    }
) =>
{
    const endpointPath = GET_EXPENSES_AND_INCOMES_API_PATH
    (
        {
            currentWeekStartEpoch: currentWeekStartEpoch,
            currentMonthStartEpoch: currentMonthStartEpoch
        }
    );
    return wrapAssertFetchJSONEndpoint<object, GetExpensesAndIncomesAPIClass.ResponseDTO>
    (
        'GET',
        path.join(getTestServerPath(), endpointPath),
        {
            bodyType: GetExpensesAndIncomesAPIClass.ResponseDTO,
            status: 200
        }
    )
};

export const createGetBalanceHistoryFunc =
(
    { division, endDate, startDate } :
    {
        division?: number,
        endDate?: number,
        startDate?: number,
    }
) =>
{
    const endpointPath = GET_BALANCE_HISTORY_API_PATH
    (
        {
            division,
            endDate,
            startDate
        }
    );
    return wrapAssertFetchJSONEndpoint<object, GetUserBalanceHistoryAPIClass.ResponseDTO>
    (
        'GET',
        path.join(getTestServerPath(), endpointPath),
        {
            bodyType: GetUserBalanceHistoryAPIClass.ResponseDTO,
            status: 200
        }
    )
};

export const createGetNetworthHistoryFunc =
(
    { division, endDate, startDate } :
    {
        division?: number,
        endDate?: number,
        startDate?: number,
    }
) =>
{
    const endpointPath = GET_NETWORTH_HISTORY_API_PATH
    (
        {
            division,
            endDate,
            startDate
        }
    );
    return wrapAssertFetchJSONEndpoint<object, GetUserNetworthHistoryAPIClass.ResponseDTO>
    (
        'GET',
        path.join(getTestServerPath(), endpointPath),
        {
            bodyType: GetUserNetworthHistoryAPIClass.ResponseDTO,
            status: 200
        }
    )
};