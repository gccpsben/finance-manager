import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { POST_TXN_TAGS_API_PATH } from "./paths.ts";
import { PostTxnAPI } from "../../../../api-types/txn.d.ts";
import { ResponsePostTxnTagsDTOBody } from "./classes.ts";
import { assertNotEquals } from 'jsr:@std/assert/not-equals';

export async function postTxnTags
(
    { port, token, tags } :
    { port: number, token: string, tags: PostTxnAPI.RequestDTO[] }
)
{
    const createdTxnTagIds: string[] = [];
    for (const tag of tags)
    {
        const txnTagResponse = await assertFetchJSON
        (
            path.join(`http://localhost:${port}`, POST_TXN_TAGS_API_PATH),
            {
                assertStatus: 200, method: "POST",
                headers: { 'authorization': token },
                body: { ...tag },
                expectedBodyType: ResponsePostTxnTagsDTOBody
            }
        );

        assertNotEquals(txnTagResponse.parsedBody, null);
        createdTxnTagIds.push(txnTagResponse.parsedBody!.id);
    }

    return createdTxnTagIds;
}