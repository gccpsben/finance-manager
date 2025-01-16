export class ToggleList<T>
{
    private values: Set<T>;

    public constructor(initValues: T[])
    {
        this.values = new Set(initValues);
    }

    public toggle(value: T)
    {
        if (this.values.has(value))
            return this.values.delete(value);
        this.values.add(value);
    }

    public toArray() { return [...this.values]; }

    public has(value:T ) { return this.values.has(value); }
}