import { registerDecorator, ValidationOptions, ValidationArguments, isInt, isPositive, isNumber } from 'class-validator';
import { Decimal } from 'decimal.js';

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
                message: "Expected an object or array instead of a string. Do not use `<any>foreignKey` to save documents."
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

export function IsDecimalJSString(validationOptions?: ValidationOptions) 
{
    return function (object: Object, propertyName: string) 
    {
        registerDecorator(
        {
            name: 'isDecimalJSString',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected a Decimal.js compatible string."
            },
            validator: 
            {
                validate(value: any, args: ValidationArguments) 
                {
                    try
                    {
                        let test = new Decimal(value);
                        return true;
                    }
                    catch(e) { return false; }
                },
            },
        });
    };
}

export function IsUTCDateInt(validationOptions?: ValidationOptions) 
{
    return function (object: Object, propertyName: string) 
    {
        registerDecorator(
        {
            name: 'isUTCDateInt',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected an UTC int representing a datetime."
            },
            validator: 
            {
                validate(value: any, args: ValidationArguments) 
                {
                    try
                    {
                        if (!isNumber(value)) return false;
                        if (!isInt(value)) return false;
                        if (!isPositive(value)) return false;
                        return true;
                    }
                    catch(e) { return false; }
                },
            },
        });
    };
}
