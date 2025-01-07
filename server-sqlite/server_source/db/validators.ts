import { registerDecorator, ValidationOptions, ValidationArguments, isInt, isPositive, isNumber, isNumberString, isString } from 'class-validator';
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
export function IsDecimalJSString()
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

export function isEpochKeyedMap(value: any)
{
    if (typeof value !== 'object') return false;
    if (Object.keys(value).some(key => !isUTCDateIntString(key))) return false;
    return true;
}
export function IsEpochKeyedMap()
{
    return function (object: Object, propertyName: string)
    {
        registerDecorator(
        {
            name: 'isEpochKeyedMap',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected a map where each key is a DateTime epoch."
            },
            validator:
            {
                validate(value: any, args: ValidationArguments)
                {
                    if (!isEpochKeyedMap(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function IsPassing(predicate: (value: any) => boolean | Promise<boolean>)
{
    return function (object: Object, propertyName: string)
    {
        registerDecorator(
        {
            name: 'IsPassing',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected a value that passes the predicate provided."
            },
            validator:
            {
                async validate(value: any, args: ValidationArguments)
                {
                    if (! await predicate(value)) return false;
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
export function IsUTCDateIntString()
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
export function IsUTCDateInt()
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

export function isPositiveIntString(value: any)
{
    try
    {
        if (!isNumberString(value)) return false;
        if (!isInt(parseFloat(value))) return false;
        if (parseInt(value) <= 0) return false;
        return true;
    }
    catch(e) { return false; }
}
export function IsPositiveIntString()
{
    return function (object: Object, propertyName: string)
    {
        registerDecorator(
        {
            name: 'isPositiveIntString',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: "Expected string with a positive int value."
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
export function IsIntString()
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
export function IsStringToStringDict()
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
export function IsStringToDecimalJSStringDict()
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