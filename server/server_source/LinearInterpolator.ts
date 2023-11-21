export class LinearInterpolator
{ 
    public entries: {key:number, value:number}[] = [];
    
    private constructor(entries: {key:number, value:number}[]) { this.entries = entries; }

    public static fromEntries<T>(entries:T[], keyingFunc?: (entry:T) => number, valueFunc?: (entry:T) => number): LinearInterpolator
    {
        if (keyingFunc === undefined) keyingFunc = (t:any) => { return t.key; };
        if (valueFunc === undefined) valueFunc = (t:any) => { return t.value; };

        let hydratedEntires = [...entries].map(x => { return { "key": keyingFunc(x), "value": valueFunc(x) } });
        let _entires = hydratedEntires.sort((a,b) => { return b.key - a.key });
        
        return new LinearInterpolator(_entires);
    }

    private inteop(valueLeft:number, valueRight:number, keyLeft:number, keyRight:number, xValue:number) 
    { 
        if (valueLeft == valueRight) return valueLeft; 
        if (keyLeft == keyRight) { console.warn("repeated keys in get"); return (valueLeft + valueRight) / 2.0; } 
        let valueRange = (valueRight - valueLeft); 
        let keyRange = keyRight - keyLeft; 
        return valueLeft + ((xValue - keyLeft) / keyRange) * valueRange; 
    } 

    /**
     * Linear interpolate values in a x-y relationship. Will return undefined if the given x value is outside the graph.
     * @param xValue 
     * @returns 
     */
    public getValueNew(xValue:number): number|undefined
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
                if (xValue > this.entries[leftIndex].key || xValue < this.entries[rightIndex].key) return undefined;
                break; 
            }

            if (curr == xValue) { leftIndex = mid; rightIndex = mid; break; }
            if (curr > xValue) leftIndex = mid;
            else if (curr < xValue) rightIndex = mid;
        }

        let lowerBound = this.entries[rightIndex >= this.entries.length ? this.entries.length - 1 : rightIndex];
        let upperBound = (this.entries[leftIndex <= 0 ? 0 : leftIndex]);

        return this.inteop(upperBound.value, lowerBound.value, upperBound.key, lowerBound.key, xValue); 
    }

    public getValue(xValue:number): number|undefined
    {
        for (let i = 1; i < this.entries.length - 1; i++) 
        { 
            let prev = this.entries[i-1];
            let curr = this.entries[i];
            let next = this.entries[i+1]; 
            let prevVal = prev.value; 
            let currVal = curr.value; 
            let nextVal = next.value; 
            let prevKey = prev.key;
            let currKey = curr.key; 
            let nextKey = next.key;
            if (xValue == prevKey) return prevVal; 
            else if (xValue == currKey) return currVal; 
            else if (xValue == nextKey) return nextVal; 
            else if (xValue < prevKey && xValue > currKey) return this.inteop(prevVal, currVal, prevKey,currKey, xValue); 
            else if (xValue < currKey && xValue > nextKey) return this.inteop(currVal, nextVal, currKey,nextKey, xValue); 
        } 

        return undefined;
    }
}