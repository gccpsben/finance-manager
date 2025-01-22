import { Decimal } from "decimal.js";

export class LinearInterpolatorVirtual
{
    private decimal2 = new Decimal("2");
    public keys: Decimal[] = [];
    private valueFunc: (entry: Decimal) => Promise<Decimal>;
    private constructor(keys: Decimal[], valueFunc: (entry: Decimal) => Promise<Decimal>)
    {
        this.keys = keys;
        this.valueFunc = valueFunc;
    }

    public static async fromEntries<T>(entries:T[], keyingFunc: (entry:T) => Promise<Decimal>, valueFunc: (entry: Decimal) => Promise<Decimal>): Promise<LinearInterpolatorVirtual>
    {
        const keys = (await Promise.all(entries.map(x => keyingFunc(x)))).sort((a,b) => b.sub(a).toNumber());
        return new LinearInterpolatorVirtual(keys, valueFunc);
    }

    private inteop(valueLeft:Decimal, valueRight:Decimal, keyLeft:Decimal, keyRight:Decimal, xValue:Decimal)
    {
        if (valueLeft == valueRight) return valueLeft;
        if (keyLeft.equals(keyRight)) return (valueLeft.add(valueRight)).dividedBy(this.decimal2); // TODO: see is this actually allowed?
        const valueRange = valueRight.sub(valueLeft);
        const keyRange = keyRight.sub(keyLeft);
        // return valueLeft + ((xValue - keyLeft) / keyRange) * valueRange;
        return valueLeft.add((xValue.sub(keyLeft)).dividedBy(keyRange).mul(valueRange));
    }

    /**
     * Linear interpolate values in a x-y relationship. Will return undefined if the given x value is outside the graph.
     * @param xValue
     * @returns
     */
    public async getValue(xValue:Decimal): Promise<Decimal | undefined>
    {
        if (this.keys.length == 0) return undefined;
        if (this.keys.length == 1) return await this.valueFunc(this.keys[0]);

        let leftIndex = 0;
        let rightIndex = this.keys.length - 1;
        let mid = Math.floor((leftIndex + rightIndex) / 2);

        for (let i = 0; i < this.keys.length; i++)
        {
            mid = Math.floor((leftIndex + rightIndex) / 2);
            const curr = this.keys[mid];

            // Reached min range
            if (Math.abs(leftIndex - rightIndex) <= 1)
            {
                if (xValue.greaterThan(this.keys[leftIndex]) || xValue.lessThan(this.keys[rightIndex]))
                    return undefined;
                break;
            }

            if (curr.equals(xValue)) { leftIndex = mid; rightIndex = mid; break; }
            if (curr.greaterThan(xValue)) leftIndex = mid;
            else if (curr.lessThan(xValue)) rightIndex = mid;
        }

        const lowerBoundKey = this.keys[rightIndex >= this.keys.length ? this.keys.length - 1 : rightIndex];
        const lowerBoundValue = await this.valueFunc(lowerBoundKey);

        const upperBoundKey = (this.keys[leftIndex <= 0 ? 0 : leftIndex]);
        const upperBoundValue = await this.valueFunc(upperBoundKey);

        return this.inteop(upperBoundValue, lowerBoundValue, upperBoundKey, lowerBoundKey, xValue) as Decimal | undefined;
    }
}