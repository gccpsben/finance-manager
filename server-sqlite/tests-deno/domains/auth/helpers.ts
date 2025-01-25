import path from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { POST_LOGIN_API_PATH } from "./paths.ts";
import { PostLoginAPIClass } from "./classes.ts";
import { getTestServerPath } from "../../init.ts";

export const createLoginToUserFunc = () =>
{
    return wrapAssertFetchJSONEndpoint
    <
        { username: string, password: string },
        PostLoginAPIClass.ResponseDTO
    >
    (
        'POST',
        path.join(getTestServerPath(), POST_LOGIN_API_PATH),
        {
            bodyType: PostLoginAPIClass.ResponseDTO,
            status: 200
        }
    )
};