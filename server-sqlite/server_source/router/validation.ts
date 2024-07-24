import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";

/**
 * This error represents a validation erorr happening in the internal logics of the server,
 * and not just incorrect RESTful requests.
 * If this happens, that means there's probably something wrong with the server itself.
 */
export class InternalValidationError extends Error
{
    public classValidatorError: ValidationError;
    public constructor(classValidatorError: ValidationError)
    {
        super();
        this.message = "Internal objects failed validations."
        this.name = "InternalValidationError";
        this.classValidatorError = classValidatorError;
    }
}

export class ExpressValidations
{
    public static async validateBodyAgainstModel<T extends object>(modelClass: ClassConstructor<T>, bodyObject: object)
    {
        const transformedObject = plainToInstance(modelClass, bodyObject);
        const validationErrors = await validate(transformedObject);
        if (validationErrors[0])
            throw validationErrors[0];
        return transformedObject;
    }
}