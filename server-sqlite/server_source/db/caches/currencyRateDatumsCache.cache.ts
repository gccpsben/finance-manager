import NodeCache from "node-cache";
import { CacheBase } from "../cacheBase.ts";

export type CurrencyRateDatumsCacheEntry =
{
    id: string,
    amount: string,
    refCurrencyId: string,
    refAmountCurrencyId: string,
    ownerId: string,
    date: number
};

export class CurrencyRateDatumsCache extends CacheBase
{
    #nodeCache = new NodeCache( { stdTTL: 50, checkperiod: 5, useClones: false } );

    public makeEntryKey(userId: string, currencyId: string)
    {
        return `${userId}-${currencyId}`;
    }

    public cacheRateDatums
    (
        userId: string,
        currencyId: string,
        datums: CurrencyRateDatumsCacheEntry[]
    )
    {
        this.#nodeCache.set(this.makeEntryKey(userId, currencyId), datums);
    }

    public invalidateRateDatums
    (
        userId: string,
        currencyId: string
    )
    {
        this.#nodeCache.del(this.makeEntryKey(userId, currencyId));
    }

    public queryRateDatums
    (
        userId: string,
        currencyId: string
    ): CurrencyRateDatumsCacheEntry[] | undefined
    {
        const result = this.#nodeCache.get(this.makeEntryKey(userId, currencyId));
        if (result === undefined) this.markCacheMiss();
        else this.markCacheHit();
        return result as CurrencyRateDatumsCacheEntry[];
    }

    public findTwoNearestDatum
    (
        userId: string,
        currencyId: string,
        date: Date | number
    )
    {
        const datums = this.queryRateDatums(userId, currencyId);
        if (!datums) return undefined;

        const targetDateEpoch = typeof date === 'number' ? date : date.getTime();
        let nearest1:CurrencyRateDatumsCacheEntry|null = null; // closest number
        let nearest2:CurrencyRateDatumsCacheEntry|null = null; // second closest number
        let minDiff1 = Infinity; // minimum difference for the closest number
        let minDiff2 = Infinity; // minimum difference for the second closest number

        for (const datum of datums)
        {
            const diff = Math.abs(datum.date - targetDateEpoch);

            // Update the nearest numbers based on the difference
            if (diff < minDiff1)
            {
                // Update second nearest to nearest and then update nearest
                nearest2 = nearest1;
                minDiff2 = minDiff1;
                nearest1 = datum;
                minDiff1 = diff;
            }
            else if (diff < minDiff2)
            {
                // Update second nearest only if it's not the same as nearest
                nearest2 = datum;
                minDiff2 = diff;
            }
        }

        return [nearest1, nearest2].map(x =>
        {
            if (x === null) return undefined;
            return {...x, difference: Math.abs(x.date - targetDateEpoch)};
        }).filter(x => !!x);
    }
}

export const GlobalCurrencyRateDatumsCache = new CurrencyRateDatumsCache();