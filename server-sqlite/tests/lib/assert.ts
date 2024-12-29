import { ClassConstructor } from "class-transformer";
import { validate, ValidationError, ValidationOptions } from "class-validator";
import path from "path";
import { validateArrayAgainstModel, validateBodyAgainstModel } from "./validation.js";

export class UnitTestAssertion extends Error
{
    public constructor(msg: string)
    {
        super();
        this.message = msg;
        this.name = "UnitTestAssertion";
    }
}

export class TestCaseTimeoutError extends Error
{
    public constructor(timeout: number)
    {
        super();
        this.message = `Test case took over ${timeout} ms to run.`;
        this.name = "TestCaseTimeoutError";
    }
}

export class UnitTestValidationError extends UnitTestAssertion
{
    public constructor(validationError: ValidationError)
    {
        super(`Validation failed: ${JSON.stringify(validationError)}`);
        this.name = "UnitTestValidationError";
    }
}

export async function assert(fn: () => Promise<boolean>)
{
    if (!(await fn()))
        throw new UnitTestAssertion(`Assertion failed (returned false).`);
}

export function assertEqual(actualValue: any, expectedValue: any)
{
    if (actualValue == expectedValue) return;
    throw new UnitTestAssertion(`Expected ${expectedValue} but got ${actualValue}`);
}

export function assertStrictEqual(actualValue: any, expectedValue: any)
{
    if (actualValue === expectedValue) return;
    throw new UnitTestAssertion(`Expected strictly ${expectedValue} but got ${actualValue}`);
}

export function assertJSONEqual(actualValue: any, expectedValue: any)
{
    if (JSON.stringify(actualValue) === JSON.stringify(expectedValue)) return;
    throw new UnitTestAssertion(`Expected strictly ${JSON.stringify(expectedValue, null, 4)} but got ${JSON.stringify(actualValue, null, 4)}`);
}

export async function assertArrayAgainstModel<T extends object>
(
    modelClass: ClassConstructor<T>,
    array: T[],
    options?: ValidationOptions
)
{
    const results = await validateArrayAgainstModel(modelClass, array, options);
    if (results.errors[0]) throw results.errors[0];
    return results.transformedObjects;
}

export async function assertBodyConfirmToModel<T extends object>
(
    modelClass: ClassConstructor<T>,
    bodyObject: object,
    options?: ValidationOptions
)
{
    const results = await validateBodyAgainstModel(modelClass, bodyObject, options);
    if (results.errors[0]) throw results.errors[0];
    return results.transformedObject;
}

export type AssertFetchConfig<ExpectedBodyType extends object> =
{
    expectedStatus?: number;
    init?: RequestInit;
    method?: string;
    body?: ReadableStream<Uint8Array> | string | Object | null;
    baseURL?: string;
    headers?: Record<string, string> | undefined;
    expectedBodyType?: ClassConstructor<ExpectedBodyType> | undefined;
};

export type AssertFetchReturns<ExpectedBodyType extends object> =
{
    res: Response;
    parsedBody?: ExpectedBodyType | undefined;
    rawBody: any;
}

export class HTTPAssert
{
    public static assertStatus(status: number, response: Response)
    {
        if (response.status !== status)
            throw new UnitTestAssertion(`Expected response from ${response.url} to have status ${status} but got ${response.status}`);
    }

    public static async assertFetch<ExpectedBodyType extends Object>
    (
        input: string | URL | globalThis.Request,
        config: AssertFetchConfig<ExpectedBodyType>
    ): Promise<AssertFetchReturns<ExpectedBodyType>>
    {
        const init: RequestInit =
        {
            method: config.method ?? 'GET',
            headers:
            {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...config.headers
            },
            ...config.init
        };

        if (config.body)
            init.body = JSON.stringify(config.body);

        const url = (() =>
        {
            let output = '';
            if (config.baseURL) output = path.join(output, config.baseURL);
            output = path.join(output, input.toString());
            return output;
        })();

        const response = await fetch(url, init);
        const rawBody = await response.json();

        let parsedBody = undefined as ExpectedBodyType | undefined;
        if (config.expectedStatus) HTTPAssert.assertStatus(config.expectedStatus, response);
        if (config.expectedBodyType)
            parsedBody = await assertBodyConfirmToModel(config.expectedBodyType, rawBody);

        return {
            res: response,
            parsedBody: parsedBody,
            rawBody: rawBody
        };
    }
}