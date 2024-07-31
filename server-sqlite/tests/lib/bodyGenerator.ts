export class BodyGenerator
{
    public static enumerateMissingField<T extends object>(completeObj: T)
    {
        const output: {obj: Partial<T>, fieldMissed: string}[] = [];
        for (let key of Object.keys(completeObj))
        {
            const item = { ...completeObj };
            delete item[key];
            output.push({ fieldMissed: key, obj: item });
        }
        return output;
    }
}