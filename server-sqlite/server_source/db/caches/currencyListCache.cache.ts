import NodeCache from "node-cache";
import { Currency } from "../entities/currency.entity.js";
import { IdBound } from "../../index.d.js";

export type CurrencyCacheEntry = {
    id: string,
    ownerId: string,
    fallbackRateCurrencyId: string | undefined,
    fallbackRateAmount: string | undefined,
    isBase: boolean,
    ticker: string
};

export class CurrencyCache
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
        return this.#nodeCache.get(this.makeEntryKey(userId, currencyId));
    }
}

export const GlobalCurrencyCache = new CurrencyCache();