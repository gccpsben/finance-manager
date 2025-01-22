import { HTTPAssert } from "../../lib/assert.ts";
import { Generator } from "../../shortcuts/generator.ts";
import { PostContainerAPI } from "../../../../api-types/container.d.ts";
import { GetContainerAPIClass, GetContainerTimelineAPIClass, PostContainerAPIClass } from "./classes.ts";
import { TESTS_ENDPOINTS } from "../../index.test.ts";

export namespace ContainerHelpers
{
    export async function postCreateContainer(config:
    {
        serverURL:string,
        token:string,
        body: Partial<PostContainerAPI.RequestDTO>,
        assertBody?: boolean,
        expectedCode?: number
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const response = await HTTPAssert.assertFetch(TESTS_ENDPOINTS['containers']['post'],
        {
            baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "POST",
            body: config.body,
            headers: { "authorization": config.token },
            expectedBodyType: assertBody ? PostContainerAPIClass.ResponseDTO : undefined
        });
        return {
            ...response,
            containerId: response.parsedBody?.id as string | undefined
        };
    }

    /** Random tnx types with unique names */
    export async function postRandomContainers(config:
    {
        serverURL:string,
        token:string,
        assertBody?: boolean,
        expectedCode?: number,
        containerCount: number
    })
    {
        const usedNames: string[] = [];
        const output: { containerId: string, containerName: string }[] = [];
        for (let i = 0; i < config.containerCount; i++)
        {
            const randomName = Generator.randUniqueName(usedNames);
            usedNames.push(randomName);
            output.push(
            {
                containerId: (await ContainerHelpers.postCreateContainer(
                {
                    body         : { name: randomName },
                    serverURL    : config.serverURL,
                    token        : config.token,
                    assertBody   : config.assertBody,
                    expectedCode : config.expectedCode
                })).containerId,
                containerName: randomName
            });
        }
        return output;
    }

    export async function getUserContainers(config:
    {
        serverURL: string,
        token: string,
        assertBody?: boolean,
        expectedCode?: number,
        dateEpoch?: number | undefined
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const url = config.dateEpoch !== undefined ?
            `${TESTS_ENDPOINTS['containers']['get']}?currencyRateDate=${config.dateEpoch}` :
            TESTS_ENDPOINTS['containers']['get'];

        const response = await HTTPAssert.assertFetch
        (
            url,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetContainerAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }

    export async function getContainerTimeline(config:
    {
        serverURL: string,
        token: string,
        containerId: string,
        division: number,
        assertBody?: boolean,
        expectedCode?: number,
        startDate?: number | undefined,
        endDate?: number | undefined,
    })
    {
        const assertBody = config.assertBody === undefined ? true : config.assertBody;
        const url = `${TESTS_ENDPOINTS['containers-timelines'].get(config.containerId, config.division, config.startDate, config.endDate)}`;

        const response = await HTTPAssert.assertFetch
        (
            url,
            {
                baseURL: config.serverURL, expectedStatus: config.expectedCode, method: "GET",
                headers: { "authorization": config.token },
                expectedBodyType: assertBody ? GetContainerTimelineAPIClass.ResponseDTO : undefined,
            }
        );
        return {
            res: response,
            parsedBody: response.parsedBody
        };
    }
}