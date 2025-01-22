import { HTTPAssert } from "../../lib/assert.ts";
import { Generator } from "../../shortcuts/generator.ts";
import { PostTxnTagsAPI } from "../../../../api-types/txnTag.d.ts";
import { ResponsePostTxnTagsDTOBody } from "./classes.ts";
import { TESTS_ENDPOINTS } from "../../index.test.ts";

export namespace TxnTagHelpers
{
    export async function postCreateTxnTag(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostTxnTagsAPI.RequestDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['transactionTags']['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? ResponsePostTxnTagsDTOBody : undefined
        });
        return {
            ...response,
            txnTagId: response.parsedBody?.id as string | undefined
        };
    }

    /** Random tnx tags with unique names */
    export async function postRandomTxnTags(config:
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
                txnId: (await TxnTagHelpers.postCreateTxnTag(
                {
                    body         : { name: randomName },
                    serverURL    : config.serverURL,
                    token        : config.token,
                    assertBody   : config.assertBody,
                    expectedCode : config.expectedCode
                })).txnTagId,
                txnName: randomName
            });
        }
        return output;
    }
}