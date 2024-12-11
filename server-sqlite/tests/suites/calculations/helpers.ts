import { UnitTestEndpoints } from "../../index.test.js";
import { HTTPAssert } from "../../lib/assert.js";
import { GetUserBalanceHistoryAPIClass, GetUserNetworthHistoryAPIClass, ResponseGetExpensesAndIncomesDTOClass } from "./classes.js";

export namespace CalculationsHelpers
{
    export async function getUserExpensesAndIncomes(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            UnitTestEndpoints.calculationsEndpoints['expensesAndIncomes'],
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? ResponseGetExpensesAndIncomesDTOClass : undefined,
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
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.calculationsEndpoints['balanceHistory']}?startDate=${config.startDate}&endDate=${config.endDate}&division=${config.division}`,
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
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.calculationsEndpoints['networthHistory']}?startDate=${config.startDate}&endDate=${config.endDate}&division=${config.division}`,
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