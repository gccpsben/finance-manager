
import { IsString } from 'class-validator';
import { TestUserDict, UnitTestEndpoints, TestUserEntry } from '../index.test.js';
import { AssertFetchReturns, HTTPAssert } from '../lib/assert.js';
import { Context } from '../lib/context.js';
import { randomUUID } from 'crypto';
import { ResponsePostLoginDTOBody } from '../auth.test.js';
import { PostTransactionDTOBody, ResponsePostTransactionDTOBody } from '../transaction.test.js';
import { PostTransactionTypesDTO } from '../../../api-types/txnType.js';
import { ResponsePostTransactionTypesDTOBody } from '../txnType.test.js';
import { PostContainerDTO, ResponsePostContainerDTO } from '../../../api-types/container.js';
import { ResponsePostContainerDTOBody } from '../container.test.js';
import { ResponsePostCurrencyDTOClass } from '../currency.test.js';
import { PostCurrencyDTO } from '../../../api-types/currencies.js';

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
        body: Partial<PostCurrencyDTO>,
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
            expectedBodyType: assertBody ? ResponsePostCurrencyDTOClass : undefined
        });
        return {
            ...response,
            currencyId: response.parsedBody?.id as string | undefined
        };
    }
}