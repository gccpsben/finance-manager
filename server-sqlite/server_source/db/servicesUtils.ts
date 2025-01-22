import { Decimal } from "decimal.js";
import { ObjectLiteral, SelectQueryBuilder } from "typeorm";

export const nameof = <T>(name: Extract<keyof T, string>): string => name;
export namespace ServiceUtils
{
    export function paginateQuery<T extends ObjectLiteral>
    (
        dbQuery: SelectQueryBuilder<T>,
        query:
        {
            startIndex?: number | undefined,
            endIndex?: number | undefined
        } | undefined
    )
    {
        if (query?.startIndex !== undefined && query?.endIndex !== undefined)
        {
            dbQuery = dbQuery
            .limit(query.endIndex - query.startIndex)
            .offset(query.startIndex);
        }
        else if (query?.startIndex !== undefined && query?.endIndex === undefined)
        {
            dbQuery = dbQuery.skip(query.startIndex);
        }
        else if (query?.startIndex === undefined && query?.endIndex !== undefined)
        {
            dbQuery = dbQuery.limit(query.startIndex);
        }
        return dbQuery;
    }

    export function normalizeEntitiesToIds<T extends {[P in IdKey]: string}, IdKey extends keyof T>
    (
        array: T[] | string[],
        key: IdKey
    ): string[]
    {
        if (array.every(i => typeof i === "string")) return array;
        else return array.map(x => x[key]);
    }

    /**
     * Given a dictionary, transform each value using a mapper.
     */
    export function mapObjectValues<T, R>(dict: { [ key: string ] : T}, mapper: (arg : T) => R)
    {
        const output: { [key: string]: R } = {};
        for (const [key, value] of Object.entries(dict))
            output[key] = mapper(value);
        return output;
    }

    /**
     * Construct a dictionary from a list of entries.
     */
    export function reverseMap<T>(entries: [string, T][])
    {
        const output: {[key: string]: T} = {};
        for (const entry of entries)
            output[entry[0]] = entry[1];
        return output;
    }

    export function ensureEntityOwnership(entity: { ownerId: string }[] | { ownerId: string }, expectedOwnerId: string)
    {
        const entities = Array.isArray(entity) ? entity : [entity];
        for (const entity of entities)
        {
            if (entity.ownerId !== expectedOwnerId)
                throw new Error("Owner mismatch.");
        }
    }

    export function minAndMax<T> (array: T[], getter: (obj:T) => number)
    {
        let lowest = Number.POSITIVE_INFINITY;
        let highest = Number.NEGATIVE_INFINITY;
        let lowestObj: T | undefined = undefined;
        let highestObj: T | undefined = undefined;
        const arrayLength = array.length;
        for (let i = 0; i < arrayLength; i++)
        {
            const obj = array[i];
            const objValue = getter(obj);

            if (objValue >= highest)
            {
                highest = objValue;
                highestObj = obj;
            }
            if (objValue <= lowest)
            {
                lowest = objValue;
                lowestObj = obj;
            }
        }
        return { minObj: lowestObj, maxObj: highestObj, min: lowest, max: highest }
    }
}

/**
 * A helper class to add value to an Object numerically via key.
 * Adding ``<key_1, 5>`` to ``{ }`` gives ``{ key_1: 5 }``,
 * and adding ``<key_1, 2>`` to ``{ key_1: 5 }`` gives ``{ key_1: 7 }``
 */
export class MapReducer<K extends string | symbol, V>
{
    public currentValue: Record<K, V>;
    public reducer: (key: K, oldVal: V | undefined, newVal: V | undefined) => Promise<V> | V;

    public constructor(initialValue: Record<K, V>, reducer: (key: K, oldVal: V | undefined, newVal: V) => Promise<V> | V)
    {
        this.currentValue = initialValue;
        this.reducer = reducer;
    }

    public async reduce(key: K, value: V)
    {
        this.currentValue[key] = await this.reducer(key, this.currentValue[key], value);
    }
}

export class DecimalAdditionMapReducer<K extends string | symbol> extends MapReducer<K, Decimal>
{
    public constructor(initialValue: Record<K, Decimal>)
    {
        super(initialValue, (_key, oldVal, newVal) => !oldVal ? newVal : newVal.add(oldVal));
    }
}

/**
 * This method is for dev-only.
 * @devOnly
 */
export async function safeWhile(maxTries:number, condition: () => boolean, callback: Function)
{
    for (let i = 0; i < maxTries; i++)
    {
        if (!condition()) return;
        await callback();
    }
    console.log(`Max retires reached. Something is wrong with your logic.`);
}