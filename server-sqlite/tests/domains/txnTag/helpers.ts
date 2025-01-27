import path from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { POST_TXN_TAGS_API_PATH } from "./paths.ts";
import { GetTxnTagsAPIClass, ResponsePostTxnTagsDTOBody } from "./classes.ts";
import { getTestServerPath } from "../../init.ts";
import { GET_TXN_TAGS_API_PATH } from './paths.ts';

export const createPostTxnTagFunc = () =>
{
    return wrapAssertFetchJSONEndpoint
    <
        { name: string },
        ResponsePostTxnTagsDTOBody
    >
    (
        'POST',
        path.join(getTestServerPath(), POST_TXN_TAGS_API_PATH),
        {
            bodyType: ResponsePostTxnTagsDTOBody,
            status: 200
        }
    )
};

export const createGetTxnTagsFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<object, GetTxnTagsAPIClass.ResponseDTOClass>
    (
        'GET',
        path.join(getTestServerPath(), GET_TXN_TAGS_API_PATH),
        {
            bodyType: GetTxnTagsAPIClass.ResponseDTOClass,
            status: 200
        }
    )
};
