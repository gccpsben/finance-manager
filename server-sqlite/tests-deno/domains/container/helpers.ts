import path from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { getTestServerPath } from '../../init.ts';
import { POST_CONTAINER_API_PATH, GET_CONTAINER_API_PATH } from './paths.ts';
import { GetContainerAPIClass, PostContainerAPIClass } from "./classes.ts";

export const createPostContainerFunc = () =>
{
    return wrapAssertFetchJSONEndpoint<{ name: string }, PostContainerAPIClass.ResponseDTO>
    (
        'POST',
        path.join(getTestServerPath(), POST_CONTAINER_API_PATH),
        {
            bodyType: PostContainerAPIClass.ResponseDTO,
            status: 200
        }
    )
};

export const createGetContainersFunc = (query: URLSearchParams | null = null) =>
{
    return wrapAssertFetchJSONEndpoint<object, GetContainerAPIClass.ResponseDTO>
    (
        'GET',
        path.join(getTestServerPath(), GET_CONTAINER_API_PATH, query === null ? '' : `?${query.toString()}`),
        {
            bodyType: GetContainerAPIClass.ResponseDTO,
            status: 200
        }
    )
};