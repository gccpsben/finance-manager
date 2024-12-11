import { PostCurrencyRateSrcAPI } from "../../../../api-types/currencyRateSource.js";
import { UnitTestEndpoints } from "../../index.test.js";
import { HTTPAssert } from "../../lib/assert.js";
import { DeleteCurrencyRateSrcAPIClass, GetCurrencyRateSrcAPIClass, PostCurrencyRateSourceAPIClass } from "./classes.js";

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
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currencyRateSourcesEndpoints['post'],
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
        const url = UnitTestEndpoints.currencyRateSourcesEndpoints.delete(config.currencySrcId);

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
        const url = UnitTestEndpoints.currencyRateSourcesEndpoints.get(config.currencyId);

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