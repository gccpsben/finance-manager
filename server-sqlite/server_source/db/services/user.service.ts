import { UserRepository } from "@/db/repositories/user.repository.js";

export class UserService
{
    public static async getUserById(userId: string)
    {
        return await UserRepository
        .getInstance()
        .findOne( { where: { id: userId } });
    }
}