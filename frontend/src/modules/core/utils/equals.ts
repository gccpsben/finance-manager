export function isNotNullOrUndefined<T>(target: T | undefined | null)
    : target is Exclude<Exclude<T, null>, undefined>
{
    return target !== undefined && target !== null;
}

export function isNullOrUndefined<T>(target: T | undefined | null)
    : target is null | undefined
{
    return target === undefined || target === null;
}