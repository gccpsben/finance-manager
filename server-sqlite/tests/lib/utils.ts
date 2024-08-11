export function isCallback<T>(maybeFunc: (() => T) | unknown): 
    maybeFunc is Function
{
    return typeof maybeFunc === 'function';
} 

export function fillArray<T>(itemCount: number, getter: () => T): T[]
export function fillArray<T>(itemCount: number, value: T): T[]
export function fillArray<T>(itemCount: number, valueOrSetter: T | (() => T)): T[]
{
    if (isCallback(valueOrSetter))
        return new Array(itemCount).fill(0).map(() => valueOrSetter());
    return new Array(itemCount).fill(valueOrSetter);
}