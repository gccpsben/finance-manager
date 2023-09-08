export class ThrottledConnection<T> 
{
    onUpdate: () => Promise<T> = undefined;
    milliseconds:number = undefined;
    lastValue:T = undefined;
    lastAccessDate:Date = undefined;

    constructor(onUpdate: ()=>Promise<T>, milliseconds: number)
    {
        this.onUpdate = onUpdate;
        this.milliseconds = milliseconds;
    }

    async updateValue()
    {
        this.lastValue = await this.onUpdate();
        this.lastAccessDate = new Date();
    }

    async get(): Promise<T|undefined>
    {
        if (this.onUpdate == undefined || this.milliseconds == undefined) { throw new Error(`Undefined onUpdate or milliseconds in ThrottledConnection`); }
        if (this.lastAccessDate == undefined) await this.updateValue();
        if ((new Date()).getTime() - this.lastAccessDate.getTime() >= this.milliseconds) await this.updateValue();
        if (this.lastValue == undefined) await this.updateValue();
        return this.lastValue;
    }
}