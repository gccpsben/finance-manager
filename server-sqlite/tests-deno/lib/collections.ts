export function isCallback<T>(maybeFunc: (() => T) | unknown):
    maybeFunc is CallableFunction
{
    return typeof maybeFunc === 'function';
}

export function fillArray<T>(itemCount: number, getter: (index: number) => T): T[]
export function fillArray<T>(itemCount: number, value: T): T[]
export function fillArray<T>(itemCount: number, valueOrSetter: T | ((index: number) => T)): T[]
{
    if (isCallback(valueOrSetter))
    {
        const output = new Array(itemCount).fill(0);
        for (let i = 0; i < output.length; i++)
            output[i] = valueOrSetter(i);
        return output;
    }
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

export async function executeInRandomOrder(promises: (() => Promise<unknown>)[])
{
    const shuffledPromises = [...promises];
    shuffleArray(shuffledPromises);
    return await Promise.all(shuffledPromises.map(promiseFn => promiseFn()));
}

export function sortDictionaryKeys<T extends { [key: string]: unknown }>(dict: T): T
{
    const sortedKeys = Object.keys(dict).sort(); // Get and sort the keys
    const sortedDict: { [key: string]: unknown }= {}; // Create a new object

    // Populate the new object with sorted keys
    for (const key of sortedKeys) {
        sortedDict[key] = dict[key];
    }

    return sortedDict as T; // Return the sorted object
}