import { TESTS_ENDPOINTS } from "../../index.test.ts";
import { HTTPAssert } from "../../lib/assert.ts";
import { GetExpensesAndIncomesAPIClass, GetUserBalanceHistoryAPIClass, GetUserNetworthHistoryAPIClass } from "./classes.ts";

export namespace CalculationsHelpers
{
    export async function getUserExpensesAndIncomes(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        currentMonthStartEpoch: number,
        currentWeekStartEpoch: number
    })
    {
        const searchParams = new URLSearchParams(
        {
            "currentMonthStartEpoch": `${config.currentMonthStartEpoch}`,
            "currentWeekStartEpoch": `${config.currentWeekStartEpoch}`,
        });
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${TESTS_ENDPOINTS['calculations-expensesAndIncomes']['get']}?${searchParams.toString()}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetExpensesAndIncomesAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }

    export async function getUserBalanceHistory(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        startDate: number,
        endDate: number,
        division: number
    })
    {
        const params: [number, number, number] = [config.startDate, config.endDate, config.division];
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${TESTS_ENDPOINTS["calculations-balanceHistory"]['get'](...params)}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetUserBalanceHistoryAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }

    export async function getUserNetworthHistory(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        startDate: number,
        endDate: number,
        division: number
    })
    {
        const params: [number, number, number] = [config.startDate, config.endDate, config.division];
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${TESTS_ENDPOINTS["calculations-networthHistory"]['get'](...params)}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetUserNetworthHistoryAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }
}