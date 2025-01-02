export class CacheBase
{
    #cacheHit = 0;
    #cacheMiss = 0;

    protected markCacheHit() {
        this.#cacheHit++;
    }

    protected markCacheMiss() {
        this.#cacheMiss++;
    }

    public getCacheMiss() { return this.#cacheMiss }
    public getCacheHit() { return this.#cacheHit }
}