import NodeCache from "node-cache";
import { CacheBase } from "../cacheBase.ts";
import { UUID } from "node:crypto";

export type CurrencyCacheEntry = {
    id: UUID,
    ownerId: UUID,
    fallbackRateCurrencyId: UUID | undefined,
    fallbackRateAmount: string | undefined,
    isBase: boolean,
    ticker: string
};

export class CurrencyCache extends CacheBase
{
    #nodeCache = new NodeCache( { stdTTL: 50, checkperiod: 5, useClones: false } );

    public makeEntryKey(userId: string, currencyId: string) { return `${userId}-${currencyId}`; }

    public cacheCurrency
    (
        userId: string,
        currency: CurrencyCacheEntry
    )
    {
        this.#nodeCache.set(this.makeEntryKey(userId, currency.id), currency);
    }

    public invalidateCurrency
    (
        userId: string,
        currencyId: string
    )
    {
        this.#nodeCache.del(this.makeEntryKey(userId, currencyId));
    }

    public queryCurrency
    (
        userId: string,
        currencyId: string
    ): CurrencyCacheEntry | undefined
    {
        const result = this.#nodeCache.get(this.makeEntryKey(userId, currencyId));
        if (result === undefined) this.markCacheMiss();
        else this.markCacheHit();
        return result as CurrencyCacheEntry;
    }

    public reset() { this.#nodeCache.flushAll(); }
}

export const GlobalCurrencyCache = new CurrencyCache();