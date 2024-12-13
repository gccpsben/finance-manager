import { UnitTestEndpoints } from "../../index.test.js";
import { AssertFetchReturns, HTTPAssert } from "../../lib/assert.js";
import { GetTxnAPI, PutTxnAPI } from "../../../../api-types/txn.js";
import { GetTxnAPIClass, PostTxnAPIClass } from "./classes.js";

export namespace TransactionHelpers
{
    export async function getTransaction(config:
    {
        serverURL: string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        start?: number,
        end?: number,
        id?: string
    })
    {
        const searchParams: Record<any,any> = {  };
        if (config.start !== undefined && config.start !== null) searchParams['start'] = config.start;
        if (config.end !== undefined && config.end !== null) searchParams['end'] = config.end;
        if (config.id !== undefined && config.id !== null) searchParams['id'] = config.id;

        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.transactionsEndpoints['get']}?${new URLSearchParams(searchParams).toString()}`,
            {
                baseURL: `${config.serverURL}`,
                expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetTxnAPIClass.ResponseDTOClass : undefined
            }
        );
        const output = response;
        return output as AssertFetchReturns<GetTxnAPI.ResponseDTO>;
    }

    export async function putTransaction(config:
    {
        serverURL: string,
        token:string,
        body: Partial<PutTxnAPI.RequestBodyDTO>,
        targetTxnId: string,
        expectedCode?: number,
    })
    {
        const queryObj = { targetTxnId: config.targetTxnId } satisfies PutTxnAPI.RequestQueryDTO;
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.transactionsEndpoints['put']}?${new URLSearchParams(queryObj).toString()}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "PUT",
                body: config.body,
                headers: { "authorization": config.token },
            }
        );
        return response as AssertFetchReturns<{}>;
    }

    export async function postCreateTransaction(config:
    {
        serverURL: string,
        token:string,
        body: Partial<PostTxnAPIClass.RequestDTOClass>,
        assertBody?: boolean,
        expectedCode?: number,
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.transactionsEndpoints['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? PostTxnAPIClass.ResponseDTOClass : undefined
        });
        const output =
        {
            ...response,
            txnId: response.parsedBody?.id as string[] | undefined
        };
        return output as AssertFetchReturns<PostTxnAPIClass.ResponseDTOClass> & { txnId?: string[] | undefined };
    }

    export async function deleteTransaction(config:
    {
        serverURL: string,
        token: string,
        txnId?: string,
        expectedCode?: number
    })
    {
        const searchParams = config.txnId === undefined ? '' : "?" + new URLSearchParams({ id: config.txnId }).toString();
        const response = await HTTPAssert.assertFetch
        (
            `${UnitTestEndpoints.transactionsEndpoints['delete']}${searchParams}`,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "DELETE",
                headers: { "authorization": config.token }
            }
        );

        return response;
    }
}