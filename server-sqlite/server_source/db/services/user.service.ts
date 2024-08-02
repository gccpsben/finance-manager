import argon2 from "argon2";
import { UserRepository } from "../repositories/user.repository.js";
import { User } from "../entities/user.entity.js";
import { FindOptionsWhere } from "typeorm";
import { AccessTokenService } from "./accessToken.service.js";

export class UserNameTakenError extends Error
{
    public constructor(username: string)
    {
        super();
        this.message = `Username '${username}' is already taken`;
        this.name = `UserNameTakenError`;    
        Object.setPrototypeOf(this, UserNameTakenError.prototype);
    }
}

export class UserService
{
    public static async getUserById(userId: string)
    {
        return await UserRepository
        .getInstance()
        .createQueryBuilder('user')
        .where(`user.id = :id`, { id: userId })
        .getOne();
    }

    public static async findAllUsers()
    {
        return await UserRepository.
        getInstance().
        find({ select: { passwordHash: false } });
    }

    public static async tryDeleteUser(userId: string): Promise<{successful: boolean, userFound: boolean}>
    {
        const targetUser = await UserRepository.getInstance().findOne({where: { id: userId }});
        if (targetUser === null) return { successful: false, userFound: false };
        await AccessTokenService.deleteTokensOfUser(targetUser.id); // delete access tokens
        await UserRepository.getInstance().delete({ id: userId });
        return { successful: true, userFound: true };
    }

    public static async registerUser(username: string, passwordRaw: string)
    {
        if (await UserService.checkUserNameTaken(username)) throw new UserNameTakenError(username);
        const newUser = UserRepository.getInstance().create();
        newUser.username = username;
        newUser.passwordHash = await argon2.hash(passwordRaw, { type: argon2.argon2id }); // salt is already included in the hash

        return await UserRepository.getInstance().save(newUser);
    }

    public static async checkUserNameTaken(username: string)
    {
        const potentialUser = await UserRepository.getInstance().findOne({where: { username: username }});
        return potentialUser === null ? false : true;
    }

    public static async validatePassword(username: string, passwordRaw: string) 
        : Promise<{success: boolean, userId: string | undefined, passwordHash: string | undefined}>
    {
        const user = await UserRepository.getInstance().findOne({where: {username: username}, select: { passwordHash: true, id: true }});
        if (user === null) return { success: false, userId: undefined, passwordHash: undefined }
        if (!(await argon2.verify(user.passwordHash, passwordRaw))) return { success: false, userId: user.id, passwordHash: user.passwordHash };
        return { success: true, userId: user.id, passwordHash: user.passwordHash }
    }
}