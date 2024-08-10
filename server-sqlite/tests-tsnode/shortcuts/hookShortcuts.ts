
import { TestUserDict, UnitTestEndpoints, TestUserEntry } from '../index.test.js';
import { AssertFetchReturns, HTTPAssert } from '../lib/assert.js';
import { randomUUID } from 'crypto';
import { ResponsePostLoginDTOBody } from '../auth.test.js';
import { PostTransactionDTOBody, ResponsePostTransactionDTOBody } from '../transaction.test.js';
import { PostTransactionTypesDTO } from '../../../api-types/txnType.js';
import { ResponsePostTransactionTypesDTOBody } from '../txnType.test.js';
import { PostContainerDTO, ResponsePostContainerDTO } from '../../../api-types/container.js';
import { ResponsePostContainerDTOBody } from '../container.test.js';
import { simpleFaker } from '@faker-js/faker';
import { Decimal } from 'decimal.js';
import { ResponseGetExpensesAndIncomesDTOClass } from '../calculations.test.js';
import { PostCurrencyAPI } from '../../../api-types/currencies.js';
import { PostCurrencyAPIClass } from '../currency.test.js';

export class HookShortcuts
{
    public static async registerRandMockUsers(serverURL:string, userCount = 5)
    {
        let randUsers: TestUserDict = {};
        for (let i = 0; i < userCount; i++)
        {
            const username = randomUUID();
            randUsers[username] = { password: randomUUID(), username: username };
        }
        return await HookShortcuts.registerMockUsers(serverURL, randUsers);
    }

    /** Register all users defined in `usersCreds`. Token will be set on each object after registering. */
    public static async registerMockUsers(serverURL: string, usersCreds: TestUserDict)
    {
        for (let [key, value] of Object.entries(usersCreds))
        {
            await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.userEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: value.username, password: value.password },
                    method: "POST"
                }
            );

            const loginResponse = await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.loginEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: value.username, password: value.password },
                    method: "POST",
                    expectedBodyType: ResponsePostLoginDTOBody
                }
            );
            usersCreds[key].token = loginResponse.parsedBody.token;
        }

        return usersCreds;
    }

    public static async registerMockUsersArray(serverURL: string, usersCreds: TestUserEntry[])
    {
        for (let user of usersCreds)
        {
            await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.userEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: user.username, password: user.password },
                    method: "POST"
                }
            );

            const loginResponse = await HTTPAssert.assertFetch
            (
                UnitTestEndpoints.loginEndpoints['post'],
                {
                    expectedStatus: 200,
                    baseURL: serverURL,
                    body: { username: user.username, password: user.password },
                    method: "POST",
                    expectedBodyType: ResponsePostLoginDTOBody
                }
            );
            user.token = loginResponse.parsedBody.token;
        }
    }

    public static async postCreateTransaction(config: 
    {
        serverURL: string, 
        token:string, 
        body: Partial<PostTransactionDTOBody>, 
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionsEndpoints['post'], 
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? ResponsePostTransactionDTOBody : undefined
        });
        const output = 
        {
            ...response,
            txnId: response.parsedBody?.id as string | undefined
        };
        return output as AssertFetchReturns<ResponsePostTransactionDTOBody> & { txnId?: string | undefined };
    }

    public static async postCreateTxnType(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostTransactionTypesDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionTypesEndpoints['post'], 
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? ResponsePostTransactionTypesDTOBody : undefined
        });
        return {
            ...response,
            txnTypeId: response.parsedBody?.id as string | undefined
        };
    }

    public static async postCreateContainer(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostContainerDTO>,
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
            expectedBodyType: assertBody ? ResponsePostContainerDTOBody : undefined
        });
        return {
            ...response,
            containerId: response.parsedBody?.id as string | undefined
        };
    }

    public static async postCreateCurrency(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostCurrencyAPI.RequestDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.currenciesEndpoints['post'], 
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

    /** Random tnx types with unique names */
    public static async postRandomTxnTypes(config: 
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        txnCount: number
    })
    {
        const usedNames: string[] = [];
        const output: { txnId: string, txnName: string }[] = [];
        for (let i = 0; i < config.txnCount; i++)
        {
            const randomName = Generator.randUniqueName(usedNames);
            usedNames.push(randomName);
            output.push(
            {
                txnId: (await HookShortcuts.postCreateTxnType(
                {
                    body: { name: randomName },
                    serverURL: config.serverURL,
                    token: config.token,
                    assertBody: config.assertBody,
                    expectedCode: config.expectedCode
                })).txnTypeId,
                txnName: randomName
            });
        }
        return output;
    }

    /** Random tnx types with unique names */
    public static async postRandomContainers(config: 
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
                containerId: (await HookShortcuts.postCreateContainer(
                {
                    body: { name: randomName },
                    serverURL: config.serverURL,
                    token: config.token,
                    assertBody: config.assertBody,
                    expectedCode: config.expectedCode
                })).containerId,
                containerName: randomName
            });
        }
        return output;
    }

    public static async postRandomRegularCurrencies(config:
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
                id: (await HookShortcuts.postCreateCurrency(
                {
                    body: 
                    { 
                        name: randomName,
                        fallbackRateAmount: amount.toString(),
                        fallbackRateCurrencyId: refCurrencyId,
                        ticker: randomName
                    },
                    serverURL: config.serverURL,
                    token: config.token,
                    assertBody: config.assertBody,
                    expectedCode: config.expectedCode,
                })).currencyId,
                amount: amount,
                name: randomName,
                refCurrencyId: refCurrencyId
            });
        }
        return output;
    }

    public static async getUserExpensesAndIncomes(config:
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

    // public static async postRandomTransaction(config:
    // {
    //     serverURL:string,
    //     token:string,
    //     assertBody?: boolean,
    //     expectedCode?: number,
    //     txnCount: number,
    //     containerIdsPool: string[],
    //     txnTypeIdsPool: string[],
    //     currencues
    // })
    // {

    // }
}

export class Generator
{
    public static randUniqueName(usedNames: string[] = [])
    {
        let currentName = "";
        do { currentName = simpleFaker.string.sample({min: 5, max: 100}); } 
        while(usedNames.includes(currentName));
        return currentName;
    }
}