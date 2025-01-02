import NodeCache from "node-cache";
import { Decimal } from "decimal.js";
import { CacheBase } from "../cacheBase.js";

type CurrencyToBaseRateCacheEntry = {[dateEpoch: string]: Decimal};
export class CurrencyToBaseRateCache extends CacheBase
{
    #nodeCache = new NodeCache( { stdTTL: 60 * 10, checkperiod: 30, useClones: false } );

    public makeEntryKey(userId: string, currencyId: string)
    {
        return `${userId}-${currencyId}`;
    }

    public cacheCurrencyToBase
    (
        userId: string,
        currencyId: string,
        date: number,
        value: Decimal
    )
    {
        if (value.toString() === "1") return; // no need to cache base currency

        const key = this.makeEntryKey(userId, currencyId);
        let dict = this.#nodeCache.get<CurrencyToBaseRateCacheEntry>(key);
        let isEmpty = dict === undefined;
        if (!dict) dict = {};
        if (isEmpty)
            this.#nodeCache.set<CurrencyToBaseRateCacheEntry>(key, dict);
        dict[`${date}`] = value;
    }

    public invalidateCurrencyToBase
    (
        userId: string,
        currencyId: string
    )
    {
        this.#nodeCache.del(this.makeEntryKey(userId, currencyId));
    }

    public queryCurrencyToBaseRate
    (
        userId: string,
        currencyId: string,
        date: number
    )
    {
        const key = this.makeEntryKey(userId, currencyId);
        let dict = this.#nodeCache.get<CurrencyToBaseRateCacheEntry>(key);
        if (!dict)
        {
            this.markCacheMiss();
            return null;
        }
        const result = dict[`${date}`];
        if (result === undefined)
        {
            this.markCacheMiss();
            return null;
        }
        this.markCacheHit();
        return result;
    }
}

export const GlobalCurrencyToBaseRateCache = new CurrencyToBaseRateCache();