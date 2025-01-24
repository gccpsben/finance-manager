import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { assertNotEquals } from "@std/assert/not-equals";
import { getTestServerPath } from '../../init.ts';
import { POST_CONTAINER_API_PATH } from './paths.ts';
import { PostContainerAPIClass } from "./classes.ts";

export async function postContainer
(
    { token, name }:
    { token: string, name: string },
)
{
    const postResponse = await assertFetchJSON
    (
        path.join(getTestServerPath(), POST_CONTAINER_API_PATH),
        {
            assertStatus: 200, method: "POST",
            headers: { 'authorization': token },
            body: { name } satisfies PostContainerAPIClass.RequestDTO,
            expectedBodyType: PostContainerAPIClass.ResponseDTO
        }
    );
    assertNotEquals(postResponse.parsedBody, undefined);
    return { contId: postResponse.parsedBody!.id };
}