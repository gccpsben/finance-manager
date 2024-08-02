import { randomUUID } from "crypto";

export class BodyGenerator
{
    public static enumerateMissingField<T extends object>(completeObj: T, excepts: string[] = [])
    {
        const output: {obj: Partial<T>, fieldMissed: string}[] = [];
        for (let key of Object.keys(completeObj))
        {
            if (excepts.includes(key)) continue;
            const item = { ...completeObj };
            delete item[key];
            output.push({ fieldMissed: key, obj: item });
        }
        return output;
    }

    /**
     * Generate test cases for relationships where each user should have only one unique item, but
     * allow repeated items within each user.
     * 
     * For example, each user should only have 1 row with Name="1",
     * but the database should allow 2 rows with Name="1" where one belongs to user 1, and the other belongs to user 2.
     * 
     * @example
     * primaryCount = 4
     * subValueCount = 2
     * 
     * user1, user2, user3, user4
     * name1  name1  name1  name1
     * name2  name2  name2  name2
     * 
     * insert user1-name1: true
     * insert user2-name1: true
     * insert user3-name1: true
     * insert user4-name1: true
     * insert user1-name2: true
     * insert user2-name2: true
     * insert user3-name2: true
     * insert user4-name2: true
     * insert user1-name2: false
     * insert user2-name2: false
     * insert user3-name2: false
     * insert user4-name2: false
     * insert user1-name1: false
     * insert user2-name1: false
     * insert user3-name1: false
     * insert user4-name1: false
     */
    public static enumeratePrimarySubPrimaryMatrixUUID(primaryCount = 4, subValueCount = 2)
    {
        const generateIDs = (count: number) => new Array(count).fill(undefined).map(x => randomUUID());
        const userIDs = generateIDs(primaryCount);
        const subValueIDs = generateIDs(subValueCount);
        const output: 
        { 
            primaryValue: string, 
            subPrimaryValue: string, 
            expectedPass: boolean,
            primaryValueIndex: number,
            subValueIndex: number
        }[] = [];
        
        let count = 0;
        let subValueIndex = 0;
        for (let subValue of [...subValueIDs, ...subValueIDs])
        {
            let primaryValueIndex = 0;
            for (let primaryValue of userIDs)
            {
                count++;
                output.push(
                {
                    primaryValue: primaryValue, 
                    subPrimaryValue: subValue, 
                    primaryValueIndex: primaryValueIndex,
                    subValueIndex: subValueIndex % (subValueCount),
                    expectedPass: count <= subValueCount * primaryCount
                });
                primaryValueIndex++;
            }
            subValueIndex++;
        }

        return {
            matrix: output,
            userIDs: userIDs,
            subValueIDs: subValueIDs
        };
    }
}