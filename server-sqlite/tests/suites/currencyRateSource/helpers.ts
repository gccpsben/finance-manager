import { PostCurrencyRateSrcAPI } from "../../../../api-types/currencyRateSource.d.ts";
import { TESTS_ENDPOINTS } from "../../index.test.ts";
import { HTTPAssert } from "../../lib/assert.ts";
import { DeleteCurrencyRateSrcAPIClass, GetCurrencyRateSrcAPIClass, PostCurrencyRateSourceAPIClass } from "./classes.ts";

export namespace CurrencyRateSourceHelpers
{
    export async function postCreateCurrencyRateSource(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostCurrencyRateSrcAPI.RequestDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['currencyRateSources']['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? PostCurrencyRateSourceAPIClass.ResponseDTO : undefined
        });
        return response;
    }

    export async function deleteCurrencySources(config:
    {
        serverURL: string,
        token: string,
        assertBody?: boolean,
        expectedCode?: number,
        currencySrcId: string
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const url = TESTS_ENDPOINTS['currencyRateSources']['delete'](config.currencySrcId);

        const response = await HTTPAssert.assertFetch
        (
            url,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "DELETE",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? DeleteCurrencyRateSrcAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }

    export async function getCurrencySources(config:
    {
        serverURL: string,
        token: string,
        assertBody?: boolean,
        expectedCode?: number,
        currencyId: string
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const url = TESTS_ENDPOINTS['currencyRateSources']['get'](config.currencyId);

        const response = await HTTPAssert.assertFetch
        (
            url,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetCurrencyRateSrcAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }
}