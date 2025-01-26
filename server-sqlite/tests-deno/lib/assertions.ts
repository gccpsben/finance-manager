import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate, ValidationError, ValidationOptions } from "class-validator";
import { assertEquals } from "@std/assert/equals";

export type HTTPMethod = "GET" | "OPTIONS" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
export type ValidationSuccessResult<T extends object> = { isSuccess: true, parsedObj: T };
export type ValidationFailureResult = { isSuccess: false, errors: ValidationError[] };
export type ExpectedOrCustom<T> = ['EXPECTED', T] | ['CUSTOM', string | object | ReadableStream<Uint8Array> | undefined];

export async function validateObjectAgainstModel<T extends object>
(
    modelClass: ClassConstructor<T>,
    bodyObject: object,
    options?: ValidationOptions
)
{
    const transformedObject = plainToInstance(modelClass, bodyObject);
    const validationErrors = await validate(transformedObject,
    {
        forbidNonWhitelisted: true,
        whitelist: true,
        ...options
    });

    const isSuccess = validationErrors.length === 0;

    if (isSuccess)
    {
        return {
            isSuccess: true as const,
            parsedObj: transformedObject
        } as ValidationSuccessResult<typeof transformedObject>;
    }
    return {
        isSuccess: false as const,
        errors: validationErrors
    } as ValidationFailureResult;
}

export async function validateArrayItemsAgainstModel<T extends object>
(
    modelClass: ClassConstructor<T>,
    array: T[],
    options?: ValidationOptions
)
{
    const output: (ValidationFailureResult | ValidationSuccessResult<T>)[] = [];
    for (const item of array)
    {
        const result = await validateObjectAgainstModel(modelClass, item, options);
        output.push(result);
    }
    return output;
}


export type AssertFetchConfig<ExpectedBodyType extends object> =
{
    assertStatus: false | number;
    method?: HTTPMethod;
    init?: RequestInit;
    body?: ReadableStream<Uint8Array> | string | object | null;
    headers?: Record<string, string> | undefined;
    expectedBodyType?: ClassConstructor<ExpectedBodyType> | undefined;
};

export type AssertFetchReturns<ExpectedBodyType extends object> =
{
    res: Response;
    parsedBody?: ExpectedBodyType | undefined;
    rawBody: unknown;
}


export type AssertFetchJSONRequest =
{
    url:string,
    method: HTTPMethod,
    init?: RequestInit;
    body?: ReadableStream<Uint8Array> | string | object | undefined;
    headers?: { mode: 'REPLACE'|'POST_MERGE'|'PRE_MERGE', value: Record<string, string> | undefined };
};
export type AssertFetchJSONAsserts<ExpectedBodyType extends object> =
{
    status?: number | undefined,
    bodyType?: ClassConstructor<ExpectedBodyType>
};
export async function assertFetchJSONNew<ExpectedBodyType extends object>
(
    req: AssertFetchJSONRequest,
    asserts: AssertFetchJSONAsserts<ExpectedBodyType> | null
)
{
    const init: RequestInit =
    {
        method: req.method ?? 'GET',
        headers: (() =>
        {
            const jsonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };

            if (req.headers === undefined) return jsonHeaders;
            if (req.headers.mode === 'REPLACE') return req.headers.value;
            if (req.headers.mode === 'POST_MERGE') return { ...jsonHeaders, ...req.headers.value }
            return { ...req.headers.value, ...jsonHeaders }
        })(),
        ...req.init
    };

    if (req.body) init.body = JSON.stringify(req.body);
    const response = await fetch(req.url, init);
    const rawBodyJSON = await response.json();

    if (asserts?.status)
        assertEquals(response.status, asserts.status, `Expected response to have status ${asserts.status}`);

    let parsedBody = undefined as ExpectedBodyType | undefined;
    if (asserts?.bodyType)
    {
        const validationResults = await validateObjectAgainstModel(asserts.bodyType, rawBodyJSON);
        if (validationResults.isSuccess) parsedBody = validationResults.parsedObj;
        else assertEquals(validationResults.isSuccess, true, `Expected response body JSON be serializable to ${asserts.bodyType.name}`);
    }

    return {
        response: response,
        parsedBody: parsedBody,
        rawBodyJSON
    };
}

/**
 * A function that wraps ``assertFetchJSONNew``, with expected body / request type.
 * This function creates a new function that can be used in the future to call specific already-defined endpoints,
 * meanwhile the new function retains the ability to adjust assertion, init and parameters for failure testings.
 */
export function wrapAssertFetchJSONEndpoint<ExpectedRequestBody extends object, ExpectedResponse extends object>(
    method: HTTPMethod,
    url: string,
    defaultAssert: AssertFetchJSONAsserts<ExpectedResponse>
)
{
    return async (
        { token, headers, body, asserts }:
        {
            token: string | undefined,
            headers?: AssertFetchJSONRequest['headers'],
            body?: ExpectedOrCustom<ExpectedRequestBody> | undefined,
            asserts?: AssertFetchJSONAsserts<ExpectedResponse> | undefined | 'default'
        }
    ) =>
    {
        return await assertFetchJSONNew
        (
            {
                method: method,
                url: url,
                body: body === undefined ? undefined : body[1],
                headers: (() =>
                {
                    if (token === undefined) return headers;
                    return { mode: 'POST_MERGE', value: { ...headers?.value, 'authorization': token } };
                })()
            },
            (() =>
            {
                if (asserts === 'default') return defaultAssert;
                return asserts ?? null;
            })()
        );
    };
}

export async function assertFetchJSON<ExpectedBodyType extends object>
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

    if (config.body) init.body = JSON.stringify(config.body);
    const url = input;

    const response = await fetch(url, init);
    const rawBody = await response.json();

    if (config.assertStatus !== false) assertEquals(response.status, config.assertStatus);

    let parsedBody = undefined as ExpectedBodyType | undefined;
    if (config.expectedBodyType)
    {
        const validationResults = await validateObjectAgainstModel(config.expectedBodyType, rawBody);
        if (validationResults.isSuccess) parsedBody = validationResults.parsedObj;
    }

    return {
        res: response,
        parsedBody: parsedBody,
        rawBody: rawBody
    };
}

export function dictWithoutKeys<
    const T extends string,
    D extends { [s: string]: unknown; } | ArrayLike<unknown>
>( dict: D, keysToDelete: T[])
{
    const output: { [key: string]: unknown } | ArrayLike<unknown> = { };
    for (const [key, value] of Object.entries(dict))
    {
        if (keysToDelete.includes(key as T)) continue;
        output[key] = value;
    }
    return output as Omit<typeof dict, T>;
}

export function assertsPrettyJSON(actual: object, expected: object)
{
    assertEquals(JSON.stringify(actual, null, 4), JSON.stringify(expected, null, 4));
}