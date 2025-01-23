import path from "node:path";
import { assertFetchJSON } from "../../lib/assertions.ts";
import { POST_LOGIN_API_PATH } from "./paths.ts";
import { PostLoginAPIClass } from "./classes.ts";
import { assertNotEquals } from "@std/assert/not-equals";

export async function loginToUser
(
    { port, username, password } :
    { port: number, username: string, password: string }
)
{
    const loginResponse = await assertFetchJSON
    (
        path.join(`http://localhost:${port}`, POST_LOGIN_API_PATH),
        {
            assertStatus: 200, method: "POST",
            body: { username: username, password: password },
            expectedBodyType: PostLoginAPIClass.ResponseDTO
        }
    );
    assertNotEquals(loginResponse.parsedBody, undefined);
    return { token: loginResponse.parsedBody!.token };
}