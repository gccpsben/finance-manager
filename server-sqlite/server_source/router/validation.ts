import { validate } from "class-validator";

export class ExpressValidations
{
    public static async validateBodyAgainstModel<T extends object>(modelClass: { new() : T }, classObj: T)
    {
        const modelInstance = new modelClass();
        for (let key of Object.keys(classObj)) modelInstance[key] = key;
        const validationErrors = await validate(modelInstance, 
        {
            forbidNonWhitelisted: true
        });
        if (validationErrors[0])
            throw validationErrors[0];
    }
}