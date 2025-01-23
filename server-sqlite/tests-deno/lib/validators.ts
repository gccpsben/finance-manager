import { isInt, isNumber, isNumberString, isPositive, registerDecorator, ValidationArguments } from "class-validator";

export function IsPassing(
    predicate: (value: unknown) => boolean | Promise<boolean>,
    msg: string | null
)
{
    return function (object: object, propertyName: string)
    {
        registerDecorator(
        {
            name: 'IsPassing',
            target: object.constructor,
            propertyName: propertyName,
            options: { message: msg ?? "Expected a value that passes the predicate provided." },
            validator:
            {
                async validate(value: unknown, _args: ValidationArguments)
                {
                    if (! await predicate(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function isUTCDateIntString(value: unknown)
{
    try
    {
        if (typeof value !== 'string') return false;
        if (!isNumberString(value)) return false;
        const parsed = parseFloat(value);
        if (!isPositive(parsed)) return false;
        if (!isInt(parsed)) return false;
        return true;
    }
    catch(_e) { return false; }
}
export function IsUTCDateIntString()
{
    return function (object: object, propertyName: string)
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
                validate(value: unknown, _args: ValidationArguments)
                {
                    if (!isUTCDateIntString(value)) return false;
                    return true;
                },
            },
        });
    };
}

export function isUTCDateInt(value: unknown)
{
    try
    {
        if (typeof value !== 'number') return false;
        if (!isNumber(value)) return false;
        if (!isInt(value)) return false;
        if (!isPositive(value)) return false;
        return true;
    }
    catch(_e) { return false; }
}
export function IsUTCDateInt()
{
    return function (object: object, propertyName: string)
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
                validate(value: unknown, _args: ValidationArguments)
                {
                    if (!isUTCDateInt(value)) return false;
                    return true;
                },
            },
        });
    };
}