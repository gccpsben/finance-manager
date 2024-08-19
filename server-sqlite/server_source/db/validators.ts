import { registerDecorator, ValidationOptions, ValidationArguments, isInt, isPositive, isNumber, isNumberString, IsNumberString } from 'class-validator';
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

export function IsUTCDateIntString(validationOptions?: ValidationOptions) 
{
    return function (object: Object, propertyName: string) 
    {
        registerDecorator(
        {
            name: 'isUTCDateIntString',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected an UTC int representing a datetime as a string."
            },
            validator: 
            {
                validate(value: any, args: ValidationArguments) 
                {
                    try
                    {
                        if (!isNumberString(value)) return false;
                        const parsed = parseFloat(value);
                        if (!isPositive(parsed)) return false;
                        if (!isInt(parsed)) return false;
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

export function IsIntString(validationOptions?: ValidationOptions) 
{
    return function (object: Object, propertyName: string) 
    {
        registerDecorator(
        {
            name: 'isIntString',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected string with int value."
            },
            validator: 
            {
                validate(value: any, args: ValidationArguments) 
                {
                    try
                    {
                        if (!isNumberString(value)) return false;
                        if (!isInt(parseFloat(value))) return false;
                        return true;
                    }
                    catch(e) { return false; }
                },
            },
        });
    };
}