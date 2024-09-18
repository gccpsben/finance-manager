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

export function shuffleArray(array: unknown[]) 
{
    for (let i = array.length - 1; i >= 0; i--) 
    {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}