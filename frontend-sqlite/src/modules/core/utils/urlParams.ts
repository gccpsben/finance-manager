export type BuildSearchParamsOptions =
{
    ignoreKey: "NONE" | "UNDEFINED" | "ALL" | "NULL"
};

/**
 * Example output: "a=1&b=123"
 */
export function buildSearchParams
(
    dict: {[key: string]: string | undefined | null},
    options?: BuildSearchParamsOptions | undefined
)
{
    const ignoreKeyPolicy = options?.ignoreKey ?? 'ALL';

    let obj: string[][] = [];
    for (const entry of Object.entries(dict))
    {
        if (entry[1] === null && (ignoreKeyPolicy === 'NULL' || ignoreKeyPolicy === 'ALL'))
            continue;
        if (entry[1] === undefined && (ignoreKeyPolicy === 'UNDEFINED' || ignoreKeyPolicy === 'ALL'))
            continue;
        obj.push([entry[0], `${entry[1]}`]);
    }

    return new URLSearchParams(obj).toString();
}