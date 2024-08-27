import { Decimal } from "decimal.js";
import { SelectQueryBuilder } from "typeorm";

export const nameof = <T>(name: Extract<keyof T, string>): string => name;
export namespace ServiceUtils
{
    export function paginateQuery<T>
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

    export function mapObjectValues<T, R>(dict: { [ key: string ] : T}, mapper: (arg : T) => R)
    {
        const output: { [key: string]: R } = {};
        for (const [key, value] of Object.entries(dict))
            output[key] = mapper(value);   
        return output;
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

    public constructor(initialValue: Record<K, V>, reducer: (key: K, oldVal: V | undefined, newVal: V | undefined) => Promise<V> | V)
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
        super(initialValue, (key, oldVal, newVal) => !oldVal ? newVal : newVal.add(oldVal));
    }
}