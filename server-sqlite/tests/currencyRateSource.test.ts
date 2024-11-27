import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { DeleteCurrencyRateSrcAPI, GetCurrencyRateSrcAPI, PostCurrencyRateSrcAPI } from "../../api-types/currencyRateSource.d.js";
import { Type } from "class-transformer";
import { Context } from "./lib/context.js";
import { resetDatabase, serverURL, TestUserDict, UnitTestEndpoints } from "./index.test.js";
import { AuthHelpers } from "./auth.test.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { assertBodyConfirmToModel, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { postBaseCurrency, postCurrency, PostCurrencyAPIClass } from "./currency.test.js";
import { Decimal } from "decimal.js";
import { randomUUID } from "crypto";

export namespace DeleteCurrencyRateSrcAPIClass
{
    export class ResponseDTO implements DeleteCurrencyRateSrcAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

export namespace GetCurrencyRateSrcAPIClass
{
    export class RequestDTO implements GetCurrencyRateSrcAPI.RequestDTO
    {
        @IsString()
        targetCurrencyId: string;
    }

    export class ResponseCurrencyRateSrcDTO implements GetCurrencyRateSrcAPI.ResponseCurrencyRateSrcDTO
    {
        @IsString() refCurrencyId: string;
        @IsString() refAmountCurrencyId: string;
        @IsString() hostname: string;
        @IsString() path: string;
        @IsString() jsonQueryString: string;
        @IsString() name: string;
        @IsString() id: string;
        @IsNumber() @IsOptional() lastExecuteTime: number;
    }

    export class ResponseDTO implements GetCurrencyRateSrcAPI.ResponseDTO
    {
        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => ResponseCurrencyRateSrcDTO)
        sources: ResponseCurrencyRateSrcDTO[];
    }
}

export namespace PostCurrencyRateSourceAPIClass
{
    export class RequestDTO implements PostCurrencyRateSrcAPI.RequestDTO
    {
        @IsString() refCurrencyId: string;
        @IsString() refAmountCurrencyId: string;
        @IsString() hostname: string;
        @IsString() path: string;
        @IsString() jsonQueryString: string;
        @IsString() name: string;
    }
    export class ResponseDTO implements PostCurrencyRateSrcAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

export default async function(this: Context)
{
    await this.module("Currencies Rates Sources", async function()
    {
        await this.module(UnitTestEndpoints.currencyRateSourcesEndpoints['post'], async function()
        {
            // Setup environment
            await resetDatabase();
            const testUsersCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
            const { username:firstUserName, token:firstUserToken } = Object.values(testUsersCreds)[0];
            const baseCurrencyResponse = await postBaseCurrency(firstUserToken, `${firstUserName}curr`, `${firstUserName}ticker`);
            const baseCurrencyID = baseCurrencyResponse.rawBody["id"] as string;
            const config =
            {
                secondaryCurrencyID: undefined as undefined | string,
                secondaryCurrencyAmount: new Decimal("7.27"),
            };
            const secondaryRes = await postCurrency(firstUserToken, randomUUID(), randomUUID(), baseCurrencyID, config.secondaryCurrencyAmount.toString());
            HTTPAssert.assertStatus(200, secondaryRes.res);
            await assertBodyConfirmToModel(PostCurrencyAPIClass.ResponseDTO, secondaryRes.rawBody);
            config.secondaryCurrencyID = secondaryRes.rawBody["id"];

            const constantFields = { name: `Src1`, hostname: "test", jsonQueryString: "test", path: "test" };
            const validReqBody = { ...constantFields, refCurrencyId: config.secondaryCurrencyID, refAmountCurrencyId: baseCurrencyID };

            await this.describe(`post`, async function()
            {

                for (const testCase of BodyGenerator.enumerateMissingField(validReqBody, []))
                {
                    await this.test(`Forbid creating sources without ${testCase.fieldMissed} but all other fields`, async function()
                    {
                        await CurrencyRateSourceHelpers.postCreateCurrencyRateSource(
                        {
                            serverURL: serverURL, body: { ...testCase.obj },
                            token: firstUserToken, assertBody: false, expectedCode: 400
                        });
                    });
                }

                await this.test(`Forbid non-existent refCurrency.`, async function()
                {
                    await CurrencyRateSourceHelpers.postCreateCurrencyRateSource(
                    {
                        serverURL: serverURL,
                        body:
                        {
                            ...constantFields,
                            refCurrencyId: config.secondaryCurrencyID + "123",
                            refAmountCurrencyId: baseCurrencyID
                        },
                        token: firstUserToken,
                        assertBody: false,
                        expectedCode: 400
                    });
                });

                await this.test(`Forbid non-existent refAmountCurrency.`, async function()
                {
                    await CurrencyRateSourceHelpers.postCreateCurrencyRateSource(
                    {
                        serverURL: serverURL,
                        body:
                        {
                            ...constantFields,
                            refCurrencyId: config.secondaryCurrencyID,
                            refAmountCurrencyId: baseCurrencyID + "123"
                        },
                        token: firstUserToken,
                        assertBody: false,
                        expectedCode: 400
                    });
                });

                await this.test(`Forbid sources without valid token`, async function()
                {
                    await CurrencyRateSourceHelpers.postCreateCurrencyRateSource(
                    {
                        serverURL: serverURL,
                        body: validReqBody,
                        token: firstUserToken + '_',
                        assertBody: false,
                        expectedCode: 401
                    });
                });

                await this.test(`Allow sources with valid token and body`, async function()
                {
                    await CurrencyRateSourceHelpers.postCreateCurrencyRateSource(
                    {
                        serverURL: serverURL,
                        body: validReqBody,
                        token: firstUserToken,
                        assertBody: true,
                        expectedCode: 200
                    });
                });
            });

            let firstPostedCurrencyRateSrc = "";
            await this.describe(`get`, async function()
            {
                await this.test(`Check for missing props on posted sources.`, async function()
                {
                    const postedCurrencySrc = await CurrencyRateSourceHelpers.getCurrencySources(
                    {
                        serverURL: serverURL,
                        token: firstUserToken,
                        assertBody: true,
                        expectedCode: 200,
                        currencyId: config.secondaryCurrencyID
                    });

                    firstPostedCurrencyRateSrc = postedCurrencySrc.parsedBody.sources[0].id;
                    assertStrictEqual(postedCurrencySrc.parsedBody.sources.length, 1);
                    assertStrictEqual(postedCurrencySrc.parsedBody.sources[0].hostname, validReqBody.hostname);
                    assertStrictEqual(postedCurrencySrc.parsedBody.sources[0].jsonQueryString, validReqBody.jsonQueryString);
                    assertStrictEqual(postedCurrencySrc.parsedBody.sources[0].name, validReqBody.name);
                    assertStrictEqual(postedCurrencySrc.parsedBody.sources[0].path, validReqBody.path);
                    assertStrictEqual(postedCurrencySrc.parsedBody.sources[0].refAmountCurrencyId, validReqBody.refAmountCurrencyId);
                    assertStrictEqual(postedCurrencySrc.parsedBody.sources[0].refCurrencyId, validReqBody.refCurrencyId);
                });
            });

            await this.describe(`delete`, async function()
            {
                await this.test(`Check if deletion works.`, async function()
                {
                    const postedCurrencySrcFromServerBeforeDel = await CurrencyRateSourceHelpers.getCurrencySources(
                    {
                        serverURL: serverURL,
                        token: firstUserToken,
                        assertBody: true,
                        expectedCode: 200,
                        currencyId: config.secondaryCurrencyID
                    });
                    assertStrictEqual(postedCurrencySrcFromServerBeforeDel.parsedBody.sources.length, 1);

                    await CurrencyRateSourceHelpers.deleteCurrencySources(
                    {
                        serverURL: serverURL,
                        token: firstUserToken,
                        assertBody: true,
                        expectedCode: 200,
                        currencySrcId: firstPostedCurrencyRateSrc
                    });

                    const postedCurrencySrcFromServerAfterDel = await CurrencyRateSourceHelpers.getCurrencySources(
                    {
                        serverURL: serverURL,
                        token: firstUserToken,
                        assertBody: true,
                        expectedCode: 200,
                        currencyId: config.secondaryCurrencyID
                    });
                    assertStrictEqual(postedCurrencySrcFromServerAfterDel.parsedBody.sources.length, 0);
                });
            });
        })
    });
}

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