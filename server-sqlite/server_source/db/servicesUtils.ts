import { SelectQueryBuilder } from "typeorm";

export class ServiceUtils
{
    public static paginateQuery<T>
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
}