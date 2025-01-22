// deno-lint-ignore-file no-namespace
import { Generator } from "../../shortcuts/generator.ts";
import { HTTPAssert } from "../../lib/assert.ts";
import { Decimal } from "decimal.js";
import { PostCurrencyAPI } from "../../../../api-types/currencies.d.ts";
import { PostCurrencyAPIClass } from "./classes.ts";
import { TESTS_ENDPOINTS } from "../../index.test.ts";

export namespace CurrencyHelpers
{
    export async function postCreateCurrency(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostCurrencyAPI.RequestDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['currencies']['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? PostCurrencyAPIClass.ResponseDTO : undefined
        });
        return {
            ...response,
            currencyId: response.parsedBody?.id as string | undefined
        };
    }

    export async function postRandomRegularCurrencies(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        currenciesCount: number,
        usedNames?: string[] | undefined,
        baseCurrencyId: string
    })
    {
        function choice<T> (list: T[]) { return list[Math.floor((Math.random()*list.length))]; }

        const output:
        {
            id: string,
            name: string,
            amount: Decimal,
            refCurrencyId: string
        }[] = [];

        const usedNames: string[] = [ ...(config.usedNames ?? []) ];
        for (let i = 0; i < config.currenciesCount; i++)
        {
            const randomName = Generator.randUniqueName(usedNames);
            const amount = new Decimal(Math.random() * 100000);
            const refCurrencyId = output.length === 0 ? config.baseCurrencyId : choice(output).refCurrencyId;

            usedNames.push(randomName);

            output.push(
            {
                id: (await CurrencyHelpers.postCreateCurrency(
                {
                    body:
                    {
                        name                   : randomName,
                        fallbackRateAmount     : amount.toString(),
                        fallbackRateCurrencyId : refCurrencyId,
                        ticker                 : randomName
                    },
                    serverURL    : config.serverURL,
                    token        : config.token,
                    assertBody   : config.assertBody,
                    expectedCode : config.expectedCode,
                })).currencyId,
                amount: amount,
                name: randomName,
                refCurrencyId: refCurrencyId
            });
        }
        return output;
    }
}