import { DataSource, Repository } from "typeorm";
import { AccessToken } from "../entities/accessToken.entity.js";
import { panic } from "../../std_errors/monadError.js";
import { randomUUID } from "node:crypto";
import { UserNotFoundError } from "../services/user.service.js";
import { UserRepository } from "./user.repository.js";
import { EnvManager } from "../../env.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { MeteredRepository } from "../meteredRepository.js";
import { AccessTokenEntry, GlobalAccessTokenCache } from "../caches/accessTokens.cache.js";
import { sha256 } from "../../crypto.js";

function hashToken(token: string) { return sha256(token); }
Object.freeze(hashToken);
function stringExhaustiveCheck(userId: unknown): asserts userId is string
{
    if (typeof userId !== 'string') throw panic(`The given userId is not a string.`);
    if (userId === null) throw panic(`The given userId is null.`);
    if (userId === undefined) throw panic(`The given userId is undefined.`);
}
Object.freeze(stringExhaustiveCheck);

export class AccessTokenRepository extends MeteredRepository
{
    #dataSource: DataSource;
    #repository: Repository<AccessToken>;

    public async getAccessTokens
    (
        userId: string | typeof QUERY_IGNORE,
        tokenRaw: string | typeof QUERY_IGNORE,
    )
    {
        // const tokenHashed = hashToken(tokenRaw);

        if (userId === QUERY_IGNORE && tokenRaw === QUERY_IGNORE) throw panic(`Having both userId and token ignored is forbidden.`);
        if (userId !== QUERY_IGNORE) stringExhaustiveCheck(userId);
        if (tokenRaw !== QUERY_IGNORE) stringExhaustiveCheck(tokenRaw);

        const cachedUserTokens = (() =>
        {
            if (userId === QUERY_IGNORE && tokenRaw !== QUERY_IGNORE)
            {
                const obj = GlobalAccessTokenCache.queryToken(hashToken(tokenRaw));
                if (!obj) return undefined;
                return [obj];
            }
            else if (userId !== QUERY_IGNORE && tokenRaw === QUERY_IGNORE)
            {
                return GlobalAccessTokenCache.queryTokensOfUser(userId);
            }
            else if (userId !== QUERY_IGNORE  && tokenRaw !== QUERY_IGNORE)
            {
                const obj = GlobalAccessTokenCache.queryTokenOfUser(userId, hashToken(tokenRaw));
                if (!obj) return undefined;
                return [obj];
            }
        })();

        // Try looking for the token in cache first (if any)
        const cachedUserTokenResult = (() =>
        {
            if (cachedUserTokens === undefined) return undefined;
            if (userId === QUERY_IGNORE && tokenRaw !== QUERY_IGNORE)
            {
                const target = cachedUserTokens.filter(x => x.tokenHashed === hashToken(tokenRaw));
                if (!!target) return target;
            }
            else if (userId !== QUERY_IGNORE && tokenRaw === QUERY_IGNORE)
            {
                const target = cachedUserTokens.filter(x => x.ownerId === userId);
                if (!!target) return target;
            }
            else if (userId !== QUERY_IGNORE  && tokenRaw !== QUERY_IGNORE)
            {
                const target = cachedUserTokens.filter(x => x.ownerId === userId && x.tokenHashed === hashToken(tokenRaw));
                if (!!target) return target;
            }
        })();

        const explicitMapperFunc = (x: AccessToken | AccessTokenEntry) =>
        {
            return {
                expiryDate: x.expiryDate,
                creationDate: x.creationDate,
                tokenHashed: x.tokenHashed,
                ownerId: x.ownerId
            }
        };

        // If we successfully found the token in cache, return it
        if (cachedUserTokenResult) return cachedUserTokenResult.map(explicitMapperFunc);

        this.incrementRead();
        const accessTokens = await this.#repository.find
        (
            {
                where:
                {
                    ...(userId === QUERY_IGNORE ? { } : { ownerId: userId }),
                    ...(tokenRaw === QUERY_IGNORE ? { } : { tokenHashed: hashToken(tokenRaw) })
                }
            }
        );

        // After reading tokens from database, cache them.
        for (const token of accessTokens)
        {
            GlobalAccessTokenCache.cacheToken(
            {
                creationDate: token.creationDate,
                expiryDate: token.expiryDate,
                ownerId: token.ownerId,
                tokenHashed: token.tokenHashed
            });
        }

        return accessTokens.map(explicitMapperFunc);
    }

    public async deleteTokensOfUser(userId: unknown)
    {
        stringExhaustiveCheck(userId);
        GlobalAccessTokenCache.invalidateUserTokens(userId);
        this.incrementWrite();
        const result = await this.#repository
        .delete({ owner: { id: userId } });
        return result;
    }

    public async deleteToken(token: string)
    {
        stringExhaustiveCheck(token);
        GlobalAccessTokenCache.invalidateToken(token);
        this.incrementWrite();
        const result = await this.#repository
        .delete({ tokenHashed: token });
        return result;
    }

    /**
     * Generate and save a new token to the database for the given user.
     * This WILL check if the user exists in the database before saving.
     */
    public async generateTokenForUser
    (
        userId: unknown,
        nowEpoch: number
    ): Promise<UserNotFoundError | {
        creationDate: number,
        expiryDate: number,
        ownerId: string,
        tokenHashed: string,
        tokenRaw: string
    }>
    {
        stringExhaustiveCheck(userId);
        if (!EnvManager.tokenExpiryMs) throw panic(`AccessTokenService.generateTokenForUser: EnvManager.tokenExpiryMs is not defined.`);

        const targetUser = await UserRepository.getInstance().findOne({where: {id: userId}});
        if (!targetUser) return new UserNotFoundError(userId);

        // TODO: Consider adding salt to prevent rainbow-table attacks.
        // TODO: Using sha256 for now for performance reason.
        const newToken = this.#repository.create();
        const tokenRaw = randomUUID();
        newToken.tokenHashed = hashToken(tokenRaw); // randomUUID should be cryptographically secure
        newToken.owner = targetUser;
        newToken.creationDate = nowEpoch;
        newToken.expiryDate = newToken.creationDate + EnvManager.tokenExpiryMs;

        this.incrementWrite();
        const newlySavedToken = await this.#repository.save(newToken);
        if (!newlySavedToken.tokenHashed) throw panic(`Newly saved token contains falsy token column.`);

        GlobalAccessTokenCache.cacheToken({
            creationDate: newToken.creationDate,
            expiryDate: newToken.expiryDate,
            ownerId: newToken.ownerId,
            tokenHashed: newToken.tokenHashed
        });

        return {
            creationDate: newToken.creationDate,
            expiryDate: newToken.expiryDate,
            ownerId: newToken.ownerId,
            tokenHashed: newToken.tokenHashed,
            tokenRaw: tokenRaw
        };
    }

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(AccessToken);
    }
}