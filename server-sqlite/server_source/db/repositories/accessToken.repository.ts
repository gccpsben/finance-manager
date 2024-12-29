import { Database } from "../db.js";
import { DataSource, Repository } from "typeorm";
import { AccessToken } from "../entities/accessToken.entity.js";
import { panic } from "../../std_errors/monadError.js";
import { randomUUID } from "crypto";
import { UserNotFoundError } from "../services/user.service.js";
import { UserRepository } from "./user.repository.js";
import { EnvManager } from "../../env.js";
import { QUERY_IGNORE } from "../../symbols.js";
import { MeteredRepository } from "../meteredRepository.js";

function validateUserIdExhaustiveCheck(userId: unknown): asserts userId is string
{
    if (typeof userId !== 'string') throw panic(`The given userId is not a string.`);
    if (userId === null) throw panic(`The given userId is null.`);
    if (userId === undefined) throw panic(`The given userId is undefined.`);
}

export class AccessTokenRepository extends MeteredRepository
{
    #dataSource: DataSource;
    #repository: Repository<AccessToken>;

    public async getAccessTokens
    (

        userId: string | typeof QUERY_IGNORE,
        token: string | typeof QUERY_IGNORE,
    )
    {
        if (userId === QUERY_IGNORE && token === QUERY_IGNORE) throw panic(`Having both userId and token ignored is forbidden.`);
        if (userId !== QUERY_IGNORE) validateUserIdExhaustiveCheck(userId);
        if (token !== QUERY_IGNORE) validateUserIdExhaustiveCheck(token);

        this.incrementRead();
        const accessTokens = await this.#repository.find
        (
            {
                where:
                {
                    ...(userId === QUERY_IGNORE ? { } : { ownerId: userId }),
                    ...(token === QUERY_IGNORE ? { } : { token: token })
                }
            }
        );
        return accessTokens.map(x =>
        {
            return {
                expiryDate: x.expiryDate,
                creationDate: x.creationDate,
                token: x.token,
                ownerId: x.ownerId
            }
        });
    }

    public async deleteTokensOfUser(userId: unknown)
    {
        validateUserIdExhaustiveCheck(userId);
        this.incrementWrite();
        const result = await this.#repository
        .delete({ owner: { id: userId } });
        return result;
    }

    public async deleteToken(token: string)
    {
        validateUserIdExhaustiveCheck(token);
        this.incrementWrite();
        const result = await this.#repository
        .delete({ token: token });
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
        token: string
    }>
    {
        validateUserIdExhaustiveCheck(userId);
        if (!EnvManager.tokenExpiryMs) throw panic(`AccessTokenService.generateTokenForUser: EnvManager.tokenExpiryMs is not defined.`);

        const targetUser = await UserRepository.getInstance().findOne({where: {id: userId}});
        if (!targetUser) return new UserNotFoundError(userId);

        const newToken = this.#repository.create();
        newToken.token = randomUUID();
        newToken.owner = targetUser;
        newToken.creationDate = nowEpoch;
        newToken.expiryDate = newToken.creationDate + EnvManager.tokenExpiryMs;
        this.incrementWrite();
        const newlySavedToken = await this.#repository.save(newToken);
        if (!newlySavedToken.token) throw panic(`Newly saved token contains falsy token column.`);

        return {
            creationDate: newToken.creationDate,
            expiryDate: newToken.expiryDate,
            ownerId: newToken.ownerId,
            token: newToken.token
        };
    }

    public constructor (datasource: DataSource)
    {
        super();
        this.#dataSource = datasource;
        this.#repository = this.#dataSource.getRepository(AccessToken);
    }
}