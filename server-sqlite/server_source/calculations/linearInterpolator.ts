import { Decimal } from "decimal.js";

export class LinearInterpolator
{
    public entries: {key:Decimal, value:Decimal}[] = [];
    private constructor(entries: {key:Decimal, value:Decimal}[]) { this.entries = entries; }
    private static decimal2 = new Decimal("2");

    public static fromEntries<T>(entries:T[], keyingFunc?: (entry:T) => Decimal, valueFunc?: (entry:T) => Decimal): LinearInterpolator
    {
        if (keyingFunc === undefined) keyingFunc = (t:any) => { return t.key; };
        if (valueFunc === undefined) valueFunc = (t:any) => { return t.value; };

        let hydratedEntires = [...entries].map(x => { return { "key": keyingFunc(x), "value": valueFunc(x) } });
        let _entires = hydratedEntires.sort((a,b) => { return b.key.sub(a.key).toNumber() });

        return new LinearInterpolator(_entires);
    }

    private inteop(valueLeft:Decimal, valueRight:Decimal, keyLeft:Decimal, keyRight:Decimal, xValue:Decimal)
    {
        if (valueLeft == valueRight) return valueLeft;
        if (keyLeft == keyRight)
        {
            console.warn("repeated keys in get");
            return (valueLeft.add(valueRight)).dividedBy(LinearInterpolator.decimal2);
        }
        let valueRange = valueRight.sub(valueLeft);
        let keyRange = keyRight.sub(keyLeft);
        // return valueLeft + ((xValue - keyLeft) / keyRange) * valueRange;
        return valueLeft.add((xValue.sub(keyLeft)).dividedBy(keyRange).mul(valueRange));
    }

    /**
     * Linear interpolate values in a x-y relationship. Will return undefined if the given x value is outside the graph.
     * @param xValue
     * @returns
     */
    public getValue(xValue:Decimal): Decimal | undefined
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
                if (xValue.greaterThan(this.entries[leftIndex].key) || xValue.lessThan(this.entries[rightIndex].key))
                    return undefined;
                break;
            }

            if (curr.equals(xValue)) { leftIndex = mid; rightIndex = mid; break; }
            if (curr.greaterThan(xValue)) leftIndex = mid;
            else if (curr.lessThan(xValue)) rightIndex = mid;
        }

        let lowerBound = this.entries[rightIndex >= this.entries.length ? this.entries.length - 1 : rightIndex];
        let upperBound = (this.entries[leftIndex <= 0 ? 0 : leftIndex]);

        return this.inteop(upperBound.value, lowerBound.value, upperBound.key, lowerBound.key, xValue) as Decimal | undefined;
    }
}