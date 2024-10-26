import { randomUUID } from "crypto";
import { AccessTokenRepository } from "../repositories/accessToken.repository.js";
import { EnvManager } from "../../env.js";
import { AccessToken } from '../entities/accessToken.entity.js';
import * as express from 'express';
import { UserRepository } from "../repositories/user.repository.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { MonadError, panic } from "../../stdErrors/monadError.js";

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
    public static async generateTokenForUser(userId: string)
    {
        if (!EnvManager.tokenExpiryMs) return void(panic(`AccessTokenService.generateTokenForUser: EnvManager.tokenExpiryMs is not defined.`));
        const newToken = AccessTokenRepository.getInstance().create();
        newToken.token = randomUUID();
        newToken.owner = await UserRepository.getInstance().findOne({where: {id: userId}});
        newToken.creationDate = Date.now();
        newToken.expiryDate = newToken.creationDate + EnvManager.tokenExpiryMs;
        await AccessTokenRepository.getInstance().save(newToken);
        return newToken;
    }

    /** Check if a token is valid, and which user it refers to. */
    public static async validateToken(tokenRaw: string): Promise<{isTokenValid: boolean, tokenFound: boolean, ownerUserId: string | undefined}>
    {
        const tokenInDatabase = await AccessTokenRepository.getInstance().findOne({ where: { token: tokenRaw }, relations: { owner: true } });
        if (!tokenRaw || tokenInDatabase === null) return { isTokenValid: false, tokenFound: false, ownerUserId: undefined };
        if (Date.now() >= tokenInDatabase.expiryDate)
        {
            await AccessTokenRepository.getInstance().delete({ token: tokenInDatabase.token });
            return {
                isTokenValid: false,
                tokenFound: true,
                ownerUserId: tokenInDatabase.owner.id
            }
        }
        return {
            isTokenValid: true,
            tokenFound: true,
            ownerUserId: tokenInDatabase.owner.id
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
                token: incompleteRow.token
            } satisfies SQLitePrimitiveOnly<AccessToken>
        });
    }

    /** Ensure an express request object has proper token in its header. */
    public static async validateRequestTokenValidated(request: express.Request) : Promise<
        InvalidLoginTokenError |
        {
            isTokenValid: boolean;
            tokenFound: boolean;
            ownerUserId: string | undefined;
        }
    >
    {
        const authorizationHeader = request.headers["authorization"];
        const validationResult = await AccessTokenService.validateToken(authorizationHeader);
        if (!validationResult.isTokenValid) return new InvalidLoginTokenError();
        return validationResult;
    }

    public static async deleteTokensOfUser(userId: string)
    {
        const result = await AccessTokenRepository.getInstance()
        .delete({ owner: { id: userId ?? null } });
        return result;
    }
}