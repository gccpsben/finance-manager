import { randomUUID } from "crypto";
import { resetDatabase, serverURL, TestUserEntry, UnitTestEndpoints } from "./index.test.js";
import { assertBodyConfirmToModel, assertStrictEqual, HTTPAssert } from "./lib/assert.js";
import { Context } from "./lib/context.js";
import { BodyGenerator } from "./lib/bodyGenerator.js";
import { Generator } from "./shortcuts/generator.js";
import { BalancesHydratedContainerDTO, ContainerDTO, GetContainerAPI, PostContainerAPI, ValueHydratedContainerDTO } from "../../api-types/container.js";
import { IsArray, IsDefined, IsNumber, IsString, ValidateNested } from "class-validator";
import { Decimal } from "decimal.js";
import { simpleFaker } from "@faker-js/faker";
import { CurrencyHelpers, PostCurrencyRateDatumAPIClass } from "./currency.test.js";
import { IsDecimalJSString, IsStringToDecimalJSStringDict, IsStringToStringDict, IsUTCDateInt } from "../server_source/db/validators.js";
import { Type } from "class-transformer";
import { AuthHelpers } from "./auth.test.js";
import { TransactionHelpers } from "./transaction.test.js";
import { TxnTagHelpers } from "./txnTag.test.js";

export class ContainerDTOClass implements ContainerDTO
{
    @IsString() id: string;
    @IsString() name: string;
    @IsUTCDateInt() creationDate: number;
    @IsString() owner: string;
}

export class BalancesValueHydratedContainerDTOClass extends ContainerDTOClass implements ValueHydratedContainerDTO, BalancesHydratedContainerDTO
{
    @IsDecimalJSString() value: string;

    @IsDefined()
    @IsStringToDecimalJSStringDict()
    balances: { [currencyId: string]: string; };
}

export namespace GetContainerAPIClass
{
    export class RequestDTO implements GetContainerAPI.RequestDTO { }
    export class ResponseDTO implements GetContainerAPI.ResponseDTO
    {
        @IsNumber() rateCalculatedToEpoch: number;
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => BalancesValueHydratedContainerDTOClass)
        rangeItems: (ValueHydratedContainerDTO & BalancesHydratedContainerDTO)[];
    }
}

export namespace PostContainerAPIClass
{
    export class RequestDTO implements PostContainerAPI.RequestDTO
    {
        @IsString() name: string;
    }

    export class ResponseDTO implements PostContainerAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}

async function postCurrencyRateDatum(token:string, amount: string, refCurrencyId: string, refAmountCurrencyId: string, date: number)
{
    const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currencyRateDatumsEndpoints['post'],
    {
        baseURL: serverURL, expectedStatus: undefined, method: "POST",
        body: { amount, refCurrencyId, refAmountCurrencyId, date } as PostCurrencyRateDatumAPIClass.RequestDTO,
        headers: { "authorization": token }
    });
    return response;
}

function choice<T> (list: T[]) { return list[Math.floor((Math.random()*list.length))]; }

export default async function(this: Context)
{
    const testDateTimestamp = Date.now();
    const offsetDate = (d: number) => testDateTimestamp + d * 100 * 1000; // convert the mock date in test case to real date

    await this.module("Containers", async function()
    {
        await this.module(UnitTestEndpoints.containersEndpoints['get'], async function()
        {
            await this.module(`post`, async function()
            {
                await resetDatabase();
                await this.test(`Forbid creating containers without / wrong tokens`, async function()
                {
                    await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints["post"],
                    {
                        baseURL: serverURL,
                        expectedStatus: 401, method: "POST"
                    });

                    await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints["post"],
                    {
                        baseURL: serverURL, expectedStatus: 401, method: "POST",
                        init: { headers: { "authorization": randomUUID() } }
                    });
                });

                await this.test(`Test for OwnerID and Name pri-subpri relationship (5x5)`, async function()
                {
                    await resetDatabase();

                    const relationshipMatrix = BodyGenerator.enumeratePrimarySubPrimaryMatrixUUID(5,5);

                    const testUsersCreds: TestUserEntry[] = relationshipMatrix.userIDs.map(user => (
                    {
                        password: `${user}password`,
                        username: user,
                    }));

                    // Register users for each user in matrix
                    await AuthHelpers.registerMockUsersArray(serverURL, testUsersCreds);

                    for (const testCase of relationshipMatrix.matrix)
                    {
                        const  userToken = testUsersCreds.find(x => x.username === testCase.primaryValue)!.token;
                        await ContainerHelpers.postCreateContainer(
                        {
                            serverURL: serverURL,
                            body: { name: testCase.subPrimaryValue },
                            token: userToken,
                            assertBody: testCase.expectedPass,
                            expectedCode: testCase.expectedPass ? 200 : 400
                        });
                    }
                });
            });

            await this.module(`get`, async function()
            {
                await resetDatabase();

                await this.test(`Forbid getting containers without / wrong tokens`, async function()
                {
                    await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints["post"],
                    {
                        baseURL: serverURL,
                        expectedStatus: 401, method: "GET"
                    });

                    await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints["post"],
                    {
                        baseURL: serverURL, expectedStatus: 401, method: "GET",
                        init: { headers: { "authorization": randomUUID() } }
                    });
                });

                await this.module(`Container balances and values correctness`, async function()
                {
                    type txnDatum =
                    {
                        toAmount: Decimal|undefined,
                        toCurrencyID?: string|undefined,
                        toContainerId?: string|undefined,
                        fromAmount: Decimal|undefined,
                        fromCurrencyID?: string|undefined,
                        fromContainerId?: string|undefined,
                        txnAgeDays: number
                    };
                    const userCreds = await AuthHelpers.registerRandMockUsers(serverURL, 1);
                    const userObj = Object.values(userCreds)[0];

                    const txnTypes = await TxnTagHelpers.postRandomTxnTags(
                    {
                        serverURL: serverURL, token: userObj.token,
                        txnCount: 3, assertBody: true, expectedCode: 200
                    });
                    const containers = await ContainerHelpers.postRandomContainers(
                    {
                        serverURL: serverURL, token: userObj.token,
                        containerCount: 3, assertBody: true, expectedCode: 200
                    });
                    const baseCurrency = await CurrencyHelpers.postCreateCurrency(
                    {
                        body: { name: "BASE", ticker: "BASE" }, serverURL: serverURL,
                        token: userObj.token, assertBody: true, expectedCode: 200
                    });
                    const secondCurrency = await CurrencyHelpers.postCreateCurrency(
                    {
                        body: { name: "SEC", ticker: "SEC", fallbackRateAmount: '1', fallbackRateCurrencyId: baseCurrency.currencyId },
                        serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200
                    });
                    const thirdCurrency = await CurrencyHelpers.postCreateCurrency(
                    {
                        body: { name: "THIRD", ticker: "THIRD", fallbackRateAmount: '1', fallbackRateCurrencyId: secondCurrency.currencyId },
                        serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200
                    });
                    const secondCurrencyDatum =
                    [
                        { key: new Decimal(`100`), value: new Decimal(`150`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`80`), value: new Decimal(`150`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`60`), value: new Decimal(`70`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`40`), value: new Decimal(`50`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`20`), value: new Decimal(`100`), cId: baseCurrency.currencyId },
                        { key: new Decimal(`0`), value: new Decimal(`0`), cId: baseCurrency.currencyId },
                    ];
                    const thirdCurrencyDatum =
                    [
                        { key: new Decimal(`100`), value: new Decimal(`100`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`80`), value: new Decimal(`150`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`60`), value: new Decimal(`25`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`40`), value: new Decimal(`50`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`20`), value: new Decimal(`25`), cId: secondCurrency.currencyId },
                        { key: new Decimal(`0`), value: new Decimal(`1`), cId: secondCurrency.currencyId },
                    ];

                    const txnsToPost: txnDatum[] =
                    [
                        {
                            fromAmount: undefined,
                            toAmount: new Decimal(`100.0000`),
                            toCurrencyID: baseCurrency.currencyId,
                            toContainerId: containers[0].containerId,
                            txnAgeDays: 90
                        },
                        {
                            fromAmount: undefined,
                            toAmount: new Decimal(`200.0000`),
                            toCurrencyID: baseCurrency.currencyId,
                            toContainerId: containers[1].containerId,
                            txnAgeDays: 80
                        },
                        {
                            fromAmount: undefined,
                            toAmount: new Decimal(`2.0000`),
                            toCurrencyID: secondCurrency.currencyId,
                            toContainerId: containers[0].containerId,
                            txnAgeDays: 80
                        },
                        {
                            fromAmount: new Decimal(`99.0000`),
                            fromCurrencyID: baseCurrency.currencyId,
                            fromContainerId: containers[0].containerId,
                            toAmount: new Decimal(`2.0000`),
                            toCurrencyID: thirdCurrency.currencyId,
                            toContainerId: containers[1].containerId,
                            txnAgeDays: 50
                        },
                    ];

                    await this.test(`Posting Currency Rate Datums`, async function()
                    {
                        async function postCurrencyDatums(cId: string, datums: {key:Decimal, value:Decimal, cId: string}[])
                        {
                            for (const datum of datums)
                            {
                                const response = await postCurrencyRateDatum
                                (
                                    userObj.token,
                                    datum.value.toString(),
                                    cId,
                                    datum.cId,
                                    offsetDate(datum.key.toNumber())
                                );

                                assertStrictEqual(response.res.status, 200);
                                await assertBodyConfirmToModel(PostCurrencyRateDatumAPIClass.ResponseDTO, response.rawBody);
                            }
                        }

                        await postCurrencyDatums(secondCurrency.currencyId, secondCurrencyDatum);
                        await postCurrencyDatums(thirdCurrency.currencyId, thirdCurrencyDatum);
                    });

                    for (const txnToPost of txnsToPost)
                    {
                        const isFrom = !!txnToPost.fromAmount;
                        const isTo = !!txnToPost.toAmount;

                        await TransactionHelpers.postCreateTransaction(
                        {
                            body:
                            {
                                title: randomUUID(),
                                creationDate: Date.now() - txnToPost.txnAgeDays * 8.64e+7,
                                description: simpleFaker.string.sample(100),
                                fromAmount: isFrom ? txnToPost.fromAmount.toString() : undefined,
                                fromContainerId: isFrom ? txnToPost.fromContainerId : undefined,
                                fromCurrencyId: isFrom ? txnToPost.fromCurrencyID : undefined,
                                toAmount: isTo ? txnToPost.toAmount.toString() : undefined,
                                toContainerId: isTo ? txnToPost.toContainerId : undefined,
                                toCurrencyId: isTo ? txnToPost.toCurrencyID : undefined,
                                txnTagId: choice(txnTypes).txnId
                            },
                            serverURL: serverURL,
                            token: userObj.token,
                            assertBody: true,
                            expectedCode: 200
                        });
                    }

                    await this.test(`Test for correctness of balances and values (1)`, async function()
                    {
                        const res = await ContainerHelpers.getUserContainers(
                        {
                            serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200,
                            dateEpoch: offsetDate(0)
                        });

                        assertStrictEqual(res.parsedBody.rangeItems.length, 3);

                        assertStrictEqual(res.parsedBody.rangeItems[0].value, "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[baseCurrency.currencyId], "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[secondCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[thirdCurrency.currencyId], undefined);

                        assertStrictEqual(res.parsedBody.rangeItems[1].value, "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[baseCurrency.currencyId], "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[thirdCurrency.currencyId], "2");

                        assertStrictEqual(res.parsedBody.rangeItems[2].value, "0");
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[baseCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[thirdCurrency.currencyId], undefined);
                    });

                    await this.test(`Test for correctness of balances and values (2)`, async function()
                    {
                        const res = await ContainerHelpers.getUserContainers(
                        {
                            serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200,
                            dateEpoch: offsetDate(15)
                        });

                        assertStrictEqual(res.parsedBody.rangeItems.length, 3);

                        assertStrictEqual(res.parsedBody.rangeItems[0].value, "151");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[baseCurrency.currencyId], "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[secondCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[thirdCurrency.currencyId], undefined);

                        assertStrictEqual(res.parsedBody.rangeItems[1].value, "3950");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[baseCurrency.currencyId], "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[thirdCurrency.currencyId], "2");

                        assertStrictEqual(res.parsedBody.rangeItems[2].value, "0");
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[baseCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[thirdCurrency.currencyId], undefined);
                    });

                    await this.test(`Test for correctness of balances and values (3)`, async function()
                    {
                        const res = await ContainerHelpers.getUserContainers(
                        {
                            serverURL: serverURL, token: userObj.token, assertBody: true, expectedCode: 200,
                            dateEpoch: offsetDate(74)
                        });

                        assertStrictEqual(res.parsedBody.rangeItems.length, 3);

                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[baseCurrency.currencyId], "1");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[secondCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[0].balances[thirdCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[0].value, "253");

                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[baseCurrency.currencyId], "200");
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[1].balances[thirdCurrency.currencyId], "2");
                        assertStrictEqual(res.parsedBody.rangeItems[1].value, "32750");

                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[baseCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[secondCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].balances[thirdCurrency.currencyId], undefined);
                        assertStrictEqual(res.parsedBody.rangeItems[2].value, "0");
                    });
                });
            });
        });
    });
}

export namespace ContainerHelpers
{
    export async function postCreateContainer(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostContainerAPI.RequestDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? PostContainerAPIClass.ResponseDTO : undefined
        });
        return {
            ...response,
            containerId: response.parsedBody?.id as string | undefined
        };
    }

    /** Random tnx types with unique names */
    export async function postRandomContainers(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        containerCount: number
    })
    {
        const usedNames: string[] = [];
        const output: { containerId: string, containerName: string }[] = [];
        for (let i = 0; i < config.containerCount; i++)
        {
            const randomName = Generator.randUniqueName(usedNames);
            usedNames.push(randomName);
            output.push(
            {
                containerId: (await ContainerHelpers.postCreateContainer(
                {
                    body         : { name: randomName },
                    serverURL    : config.serverURL,
                    token        : config.token,
                    assertBody   : config.assertBody,
                    expectedCode : config.expectedCode
                })).containerId,
                containerName: randomName
            });
        }
        return output;
    }

    export async function getUserContainers(config:
    {
        serverURL: string,
        token: string,
        assertBody?: boolean,
        expectedCode?: number,
        dateEpoch?: number | undefined
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const url = config.dateEpoch !== undefined ?
            `${UnitTestEndpoints.containersEndpoints['get']}?currencyRateDate=${config.dateEpoch}` :
            UnitTestEndpoints.containersEndpoints['get'];

        const response = await HTTPAssert.assertFetch
        (
            url,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetContainerAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }
}