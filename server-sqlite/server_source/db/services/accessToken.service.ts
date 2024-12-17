import * as Express from 'express';
import { MonadError, panic } from "../../std_errors/monadError.js";
import { Database } from "../db.js";
import { QUERY_IGNORE } from "../../symbols.js";

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
    /** Check if a token is valid, and which user it refers to. */
    public static async validateToken
    (
        tokenRaw: string,
        nowEpoch: number
    ): Promise<{isTokenValid: boolean, tokenFound: boolean, ownerUserId: string | undefined}>
    {
        const tokenInDatabase = (await Database.getAccessTokenRepository()!.getAccessTokens(QUERY_IGNORE, tokenRaw))[0];

        if (!tokenRaw || tokenInDatabase === undefined) return { isTokenValid: false, tokenFound: false, ownerUserId: undefined };
        if (nowEpoch >= tokenInDatabase.expiryDate)
        {
            await Database.getAccessTokenRepository()!.deleteToken(tokenRaw);
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
}