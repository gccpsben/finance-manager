import { registerDecorator, ValidationOptions, ValidationArguments, isInt, isPositive, isNumber, isNumberString, IsNumberString, isString } from 'class-validator';
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

export function isDecimalJSString(value: any)
{
    try { const test = new Decimal(value); return true; }
    catch(e) { return false; }
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
                    if (!isDecimalJSString(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function isUTCDateIntString(value: any)
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
                    if (!isUTCDateIntString(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function isUTCDateInt(value: any)
{
    try
    {
        if (!isNumber(value)) return false;
        if (!isInt(value)) return false;
        if (!isPositive(value)) return false;
        return true;
    }
    catch(e) { return false; }
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
                    if (!isUTCDateInt(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function isIntString(value: any)
{
    try
    {
        if (!isNumberString(value)) return false;
        if (!isInt(parseFloat(value))) return false;
        return true;
    }
    catch(e) { return false; }
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
                    if (!isIntString(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function isStringToStringDict(value :any)
{
    try
    {
        if (value === undefined || value === null) return false;
        if (typeof value !== 'object') return false;
        if (Object.keys(value).some(x => !isString(x))) return false;
        if (Object.values(value).some(x => !isString(x))) return false;
        return true;
    }
    catch(e) { return false; }
}
export function IsStringToStringDict(validationOptions?: ValidationOptions) 
{
    return function (object: Object, propertyName: string) 
    {
        registerDecorator(
        {
            name: 'isStringToStringDict',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected an object where key and value are both string."
            },
            validator: 
            {
                validate(value: any, args: ValidationArguments) 
                {
                    if (!isStringToStringDict(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function isStringToDecimalJSStringDict(value:any)
{
    try
    {
        if (!isStringToStringDict(value)) return false;
        if (Object.values(value).some(x => !isDecimalJSString(x))) return false;
        return true;
    }
    catch(e) { return false; }
}
export function IsStringToDecimalJSStringDict(validationOptions?: ValidationOptions) 
{
    return function (object: Object, propertyName: string) 
    {
        registerDecorator(
        {
            name: 'isStringToDecimalJSStringDict',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected an object where keys are string, values are Decimal.js string"
            },
            validator: 
            {
                validate(value: any, args: ValidationArguments) 
                {
                    if (!isStringToDecimalJSStringDict(value)) return false;
                    return true;
                },
            },
        });
    };
}