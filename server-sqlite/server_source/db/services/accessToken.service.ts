import { randomUUID } from "crypto";
import { AccessTokenRepository } from "../repositories/accessToken.repository.js";
import { EnvManager } from "../../env.js";
import { AccessToken } from '../entities/accessToken.entity.js';
import * as Express from 'express';
import { UserRepository } from "../repositories/user.repository.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { MonadError, panic } from "../../std_errors/monadError.js";
import { UserNotFoundError } from "./user.service.js";

export class InvalidLoginTokenError extends MonadError<typeof InvalidLoginTokenError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    constructor()
    {
        super(InvalidLoginTokenError.ERROR_SYMBOL, `The given token is either expired, or invalid.`);
        this.name = this.constructor.name;
    }
}

export class AccessTokenService
{
    public static async generateTokenForUser(userId: string, nowEpoch: number)
    {
        // @ts-expect-error
        if (!EnvManager.tokenExpiryMs) return panic(`AccessTokenService.generateTokenForUser: EnvManager.tokenExpiryMs is not defined.`) as AccessToken;

        const targetUser = await UserRepository.getInstance().findOne({where: {id: userId}});
        if (!targetUser) return new UserNotFoundError(userId);

        const newToken = AccessTokenRepository.getInstance().create();
        newToken.token = randomUUID();
        newToken.owner = targetUser;
        newToken.creationDate = nowEpoch;
        newToken.expiryDate = newToken.creationDate + EnvManager.tokenExpiryMs;
        const newlySavedToken = await AccessTokenRepository.getInstance().save(newToken);
        if (!newlySavedToken.token) throw panic(`Newly saved token contains falsy token column.`);
        return newToken as (typeof newToken & { token: string });
    }

    /** Check if a token is valid, and which user it refers to. */
    public static async validateToken
    (
        tokenRaw: string,
        nowEpoch: number
    ): Promise<{isTokenValid: boolean, tokenFound: boolean, ownerUserId: string | undefined}>
    {
        const tokenInDatabase = await AccessTokenRepository.getInstance().findOne({ where: { token: tokenRaw }, relations: { owner: true } });
        if (!tokenRaw || tokenInDatabase === null) return { isTokenValid: false, tokenFound: false, ownerUserId: undefined };
        if (nowEpoch >= tokenInDatabase.expiryDate)
        {
            await AccessTokenRepository.getInstance().delete({ token: tokenInDatabase.token });
            return {
                isTokenValid: false,
                tokenFound: true,
                ownerUserId: tokenInDatabase.ownerId
            }
        }
        return {
            isTokenValid: true,
            tokenFound: true,
            ownerUserId: tokenInDatabase.ownerId
        }
    }

    public static async getAccessTokensOfUser(userId: string)
    {
        return (await AccessTokenRepository
        .getInstance()
        .find( { where: { owner: { id: userId } } }))
        .map(incompleteRow =>
        {
            return {
                expiryDate: incompleteRow.expiryDate,
                creationDate: incompleteRow.creationDate,
                token: incompleteRow.token,
                ownerId: userId
            } satisfies SQLitePrimitiveOnly<AccessToken>
        });
    }

    /** Ensure an express request object has proper token in its header. */
    public static async validateRequestTokenValidated
    (
        request: Express.Request,
        nowEpoch: number
    ) : Promise<
        InvalidLoginTokenError |
        {
            isTokenValid: boolean;
            tokenFound: boolean;
            ownerUserId: string;
        }
    >
    {
        const createErr = () => new InvalidLoginTokenError();

        const authorizationHeader = request.headers["authorization"];
        if (authorizationHeader === null || authorizationHeader === undefined) return createErr();
        const validationResult = await AccessTokenService.validateToken(authorizationHeader, nowEpoch);

        if (!validationResult.isTokenValid || !validationResult.ownerUserId || !validationResult.tokenFound)
            return createErr();

        return {
            isTokenValid: true,
            tokenFound: true,
            ownerUserId: validationResult.ownerUserId!
        };
    }

    public static async deleteTokensOfUser(userId: string)
    {
        const result = await AccessTokenRepository.getInstance()
        .delete({ owner: { id: userId ?? null } });
        return result;
    }
}