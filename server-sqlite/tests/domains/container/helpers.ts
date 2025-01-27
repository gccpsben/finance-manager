import path from "node:path";
import { wrapAssertFetchJSONEndpoint } from "../../lib/assertions.ts";
import { getTestServerPath } from '../../init.ts';
import { POST_CONTAINER_API_PATH, GET_CONTAINER_API_PATH } from './paths.ts';
import { GetContainerAPIClass, GetContainerTimelineAPIClass, PostContainerAPIClass } from "./classes.ts";
import { GET_CONTAINER_TIMELINE_API_PATH } from './paths.ts';

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

export const createGetContainerTimelineFunc = (
    { cId, division, startDate, endDate }:
    { cId: string, division: number, startDate?: number | undefined, endDate?: number | undefined }
) =>
{
    const searchParamsStr = (new URLSearchParams(
    {
        ... cId === undefined ? {} : { containerId: cId  },
        ... division === undefined ? {} : { division: `${division}` },
        ... startDate === undefined ? {} : { startDate: `${startDate}` },
        ... endDate === undefined ? {} : { endDate: `${endDate}` }
    })).toString();

    return wrapAssertFetchJSONEndpoint<
        object,
        GetContainerTimelineAPIClass.ResponseDTO
    >
    (
        'GET',
        path.join(getTestServerPath(), GET_CONTAINER_TIMELINE_API_PATH, searchParamsStr === "" ? "" : `?${searchParamsStr}`),
        {
            bodyType: GetContainerTimelineAPIClass.ResponseDTO,
            status: 200
        }
    )
};