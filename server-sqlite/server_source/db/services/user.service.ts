import argon2 from "argon2";
import { UserRepository } from "../repositories/user.repository.js";

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
        .findOne( { where: { id: userId } });
    }

    public static async findAllUsers()
    {
        return await UserRepository.
        getInstance().
        find({ select: { passwordHash: false } });
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