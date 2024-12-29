export class MeteredRepository
{
    #dbReadQueryCount: number = 0;
    #dbWriteQueryCount: number = 0;
    protected incrementRead() { this.#dbReadQueryCount++ }
    protected incrementWrite() { this.#dbWriteQueryCount++ }
    public getDbReadQueryCount() { return this.#dbReadQueryCount; }
    public getDbWriteQueryCount() { return this.#dbWriteQueryCount; }
}