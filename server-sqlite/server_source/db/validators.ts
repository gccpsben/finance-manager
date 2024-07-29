import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function EnsureNotPlainForeignKey(validationOptions?: ValidationOptions) 
{
    return function (object: Object, propertyName: string) 
    {
        registerDecorator(
        {
            name: 'notPlainForeignKey',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected an object or array instead of a string. Please dont use `<any>foreignKey` to save documents."
            },
            validator: 
            {
                validate(value: any, args: ValidationArguments) 
                {
                    return typeof value !== 'string';
                },
            },
        });
    };
}