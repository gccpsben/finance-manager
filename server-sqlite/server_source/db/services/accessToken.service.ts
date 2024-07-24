import { AccessTokenRepository } from "../repositories/accessToken.repository.js";

export class AccessTokenService
{
    public static async getAccessTokensOfUser(userId: string)
    {
        return await AccessTokenRepository
        .getInstance()
        .find( { where: { owner: { id: userId } } });
    }
}