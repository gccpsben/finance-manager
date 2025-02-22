import NodeCache from "node-cache";
import { CacheBase } from "../cacheBase.ts";
import { UUID } from "node:crypto";

export type UserEntry =
{
    name: string;
    id: UUID;
};

export class UserCache extends CacheBase
{
    #nodeCache = new NodeCache( { stdTTL: 50, checkperiod: 5, useClones: false } );

    public makeEntryKey(id: string) { return `${id}`; }

    public cacheUser (user: UserEntry)
    {
        this.#nodeCache.set<UserEntry>(this.makeEntryKey(user.id), { id: user.id, name: user.name });
    }

    public invalidateUser(userId: string) { this.#nodeCache.del(userId); }

    public queryUserById(userId: string): UserEntry | undefined
    {
        const user = this.#nodeCache.get<UserEntry>(this.makeEntryKey(userId));
        if (user === undefined) this.markCacheMiss();
        else this.markCacheHit();
        return user;
    }

    public reset() { this.#nodeCache.flushAll(); }
}

export const GlobalUserCache = new UserCache();