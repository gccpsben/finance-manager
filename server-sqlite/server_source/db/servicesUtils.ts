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
        }
    )
    {
        if (query.startIndex !== undefined && query.endIndex !== undefined)
        {
            dbQuery = dbQuery
            .limit(query.endIndex - query.startIndex)
            .offset(query.startIndex);
        }
        else if (query.startIndex !== undefined && query.endIndex === undefined)
        {
            dbQuery = dbQuery.skip(query.startIndex);  
        }
        else if (query.startIndex === undefined && query.endIndex !== undefined)
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