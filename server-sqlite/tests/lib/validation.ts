import { ClassConstructor, plainToInstance } from "class-transformer";
import { ValidationOptions, validate } from "class-validator";
import { UnitTestValidationError } from "./assert.js";

export async function validateBodyAgainstModel<T extends object>
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
    return { errors: validationErrors.map(x => new UnitTestValidationError(x)), transformedObject: transformedObject };
}

export async function validateArrayAgainstModel<T extends object>
(
    modelClass: ClassConstructor<T>,
    array: T[],
    options?: ValidationOptions
)
{
    const output = { errors: [] as UnitTestValidationError[], transformedObjects: [] as T[] };
    for (const item of array)
    {
        let result = await validateBodyAgainstModel(modelClass, item, options);
        if (result.errors.length) output.errors = output.errors.concat(result.errors);
        if (result.transformedObject) output.transformedObjects.push(result.transformedObject);
    }
    return output;
}