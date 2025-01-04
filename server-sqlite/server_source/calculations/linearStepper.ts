import { Decimal } from "decimal.js";

// TODO: Make unit test
export class LinearStepper<V>
{
    public entries: { key:Decimal, value:V }[] = [];
    private constructor(entries: { key:Decimal, value:V }[]) { this.entries = entries; }

    public static fromEntries<V>(entries:{ key: Decimal, value: V }[]): LinearStepper<V>
    {
        let _entires = entries.sort((a,b) => b.key.sub(a.key).toNumber());
        return new LinearStepper<V>(_entires);
    }

    public static fromEntriesWithMapper<T, V>(entries: T[], mapper: (item: T) => { key: Decimal, value: V })
    {
        return this.fromEntries(
            entries.map(entry => mapper(entry))
        );
    }

    public getMaxKey(): Decimal | undefined { return this.entries[0].key; }
    public getMinKey(): Decimal | undefined { return this.entries[this.entries.length - 1].key; }

    public getValue(xValue:Decimal, initial: V): V | undefined
    {
        if (this.entries.length == 0) return undefined;
        if (this.entries.length == 1) return this.entries[0].value;

        let leftIndex = 0;
        let rightIndex = this.entries.length - 1;
        let mid = Math.floor((leftIndex + rightIndex) / 2);

        for (let i = 0; i < this.entries.length; i++)
        {
            mid = Math.floor((leftIndex + rightIndex) / 2);
            let curr = this.entries[mid].key;

            // Reached min range
            if (Math.abs(leftIndex - rightIndex) <= 1)
            {
                if (xValue.greaterThanOrEqualTo(this.entries[leftIndex].key))
                    return this.entries[leftIndex].value;
                if (xValue.lessThan(this.entries[rightIndex].key))
                    return initial;
                break;
            }

            if (curr.equals(xValue)) { leftIndex = mid; rightIndex = mid; break; }
            if (curr.greaterThan(xValue)) leftIndex = mid;
            else if (curr.lessThan(xValue)) rightIndex = mid;
        }

        let lowerBound = this.entries[rightIndex >= this.entries.length ? this.entries.length - 1 : rightIndex];
        return lowerBound.value;
    }
}