import { randomUUID } from "crypto";
import { AccessTokenRepository } from "../repositories/accessToken.repository.js";
import { EnvManager } from "../../env.js";
import { AccessToken } from '../entities/accessToken.entity.js';

export class AccessTokenService
{
    public static async generateTokenForUser(userId: string)
    {
        if (!EnvManager.tokenExpiryMs) throw new Error(`AccessTokenService.generateTokenForUser: EnvManager.tokenExpiryMs is not defined.`);
        const newToken = AccessTokenRepository.getInstance().create();
        newToken.token = randomUUID();
        newToken.owner = <any>userId;
        newToken.creationDate = new Date();
        newToken.expiryDate = new Date(newToken.creationDate.getTime() + EnvManager.tokenExpiryMs);
        await AccessTokenRepository.getInstance().save(newToken);
        return newToken;
    }

    /** Check if a token is valid, and which user it refers to. */
    public static async validateToken(tokenRaw: string): Promise<{isTokenValid: boolean, tokenFound: boolean, ownerUserId: string | undefined}>
    {
        const tokenInDatabase = await AccessTokenRepository.getInstance().findOne({ where: { token: tokenRaw }, relations: { owner: true } });
        if (tokenInDatabase === null) return { isTokenValid: false, tokenFound: false, ownerUserId: undefined };
        if (new Date().getTime() >= tokenInDatabase.expiryDate.getTime())
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
            } satisfies Partial<AccessToken>
        });
    }

    public static async deleteTokensOfUser(userId: string)
    {
        const result = await AccessTokenRepository.getInstance().delete({ owner: <any>userId });
        return result;
    }
}