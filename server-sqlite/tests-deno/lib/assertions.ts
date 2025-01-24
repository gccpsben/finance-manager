import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate, ValidationError, ValidationOptions } from "class-validator";
import { assertEquals } from "@std/assert/equals";

export type HTTPMethod = "GET" | "OPTIONS" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
export type ValidationSuccessResult<T extends object> = { isSuccess: true, parsedObj: T };
export type ValidationFailureResult = { isSuccess: false, errors: ValidationError[] };

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