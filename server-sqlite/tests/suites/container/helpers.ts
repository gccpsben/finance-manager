import { UnitTestEndpoints } from "../../index.test.js";
import { HTTPAssert } from "../../lib/assert.js";
import { Generator } from "../../shortcuts/generator.js";
import { PostContainerAPI } from "../../../../api-types/container.js";
import { GetContainerAPIClass, PostContainerAPIClass } from "./classes.js";

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
        const response = await HTTPAssert.assertFetch(UnitTestEndpoints.containersEndpoints['post'],
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
            `${UnitTestEndpoints.containersEndpoints['get']}?currencyRateDate=${config.dateEpoch}` :
            UnitTestEndpoints.containersEndpoints['get'];

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
}