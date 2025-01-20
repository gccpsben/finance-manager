import NodeCache from "node-cache";
import { CacheBase } from "../cacheBase.js";

export type AccessTokenEntry =
{
    token: string,
    ownerId: string,
    creationDate: number,
    expiryDate: number
};

export class AccessTokenCache extends CacheBase
{
    #nodeCache = new NodeCache( { stdTTL: 50, checkperiod: 5, useClones: false } );

    public makeEntryKey(ownerId: string) { return `${ownerId}`; }

    public cacheToken (token: AccessTokenEntry)
    {
        const tokensOfUser = this.#nodeCache.get<AccessTokenEntry[]>(this.makeEntryKey(token.ownerId));
        if (!tokensOfUser) this.#nodeCache.set<AccessTokenEntry[]>(this.makeEntryKey(token.ownerId), [{...token}]);
        else tokensOfUser.push({...token});
    }

    public invalidateUserToken(ownerId: string, token: string)
    {
        const tokensOfUser = this.#nodeCache.get<AccessTokenEntry[]>(this.makeEntryKey(ownerId));
        if (!tokensOfUser) return;
        const targetIndex = tokensOfUser.findIndex(t => t.token === token && t.ownerId === ownerId);
        if (targetIndex !== -1) tokensOfUser.splice(targetIndex, 1);
    }

    public invalidateToken(token: string)
    {
        for (const cacheKey of this.#nodeCache.keys())
        {
            const tokensOfUser = this.#nodeCache.get<AccessTokenEntry[]>(cacheKey);
            if (!tokensOfUser) continue;
            const targetIndex = tokensOfUser.findIndex(t => t.token === token);
            if (targetIndex !== -1) tokensOfUser.splice(targetIndex, 1);
        }
    }

    public invalidateUserTokens(userId: string)
    {
        this.#nodeCache.del(userId);
    }

    public queryTokensOfUser(ownerId: string): AccessTokenEntry[] | undefined
    {
        const tokensOfUser = this.#nodeCache.get<AccessTokenEntry[]>(this.makeEntryKey(ownerId));
        if (tokensOfUser === undefined) this.markCacheMiss();
        else this.markCacheHit();
        return tokensOfUser;
    }

    public queryTokenOfUser(ownerId: string, token: string): AccessTokenEntry | undefined
    {
        const tokensOfUser = this.#nodeCache.get<AccessTokenEntry[]>(this.makeEntryKey(ownerId));
        const tokenObj = tokensOfUser?.find(x => x.token === token && x.ownerId === ownerId);
        if (tokenObj === undefined) this.markCacheMiss();
        else this.markCacheHit();
        return tokenObj;
    }

    public queryToken(token: string): AccessTokenEntry | undefined
    {
        for (const cacheKey of this.#nodeCache.keys())
        {
            const allTokensOfKey = this.#nodeCache.get<AccessTokenEntry[]>(cacheKey)!;
            const potentialTargetObj = allTokensOfKey.find(t => t.token === token);
            if (!potentialTargetObj) continue;
            this.markCacheHit();
            return potentialTargetObj;
        }
        this.markCacheMiss();
        return undefined;
    }
}

export const GlobalAccessTokenCache = new AccessTokenCache();