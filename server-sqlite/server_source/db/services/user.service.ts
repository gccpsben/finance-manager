import argon2 from "argon2";
import { UserRepository } from "../repositories/user.repository.js";
import { nameofU, User } from "../entities/user.entity.js";
import { MonadError } from "../../std_errors/monadError.js";
import { Database } from "../db.js";

export class UserNotFoundError extends MonadError<typeof UserNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public userId: string;

    constructor(userId: string)
    {
        super(UserNotFoundError.ERROR_SYMBOL, `The given user id \"${userId}\" is not found.`);
        this.name = this.constructor.name;
        this.userId = userId;
    }
}

export class UserNameTakenError extends MonadError<typeof UserNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public username: string;

    constructor(username: string)
    {
        super(UserNotFoundError.ERROR_SYMBOL, `Username '${username}' is already taken`);
        this.name = this.constructor.name;
        this.username = username;
    }
}

export class UserService
{
    public static async getUserById(userId: string): Promise<User | null>
    {
        return await UserRepository
        .getInstance()
        .createQueryBuilder('user')
        .where(`user.${nameofU('id')} = :id`, { id: userId })
        .getOne() ?? null;
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
        await Database.getAccessTokenRepository()!.deleteTokensOfUser(targetUser.id); // delete access tokens
        await UserRepository.getInstance().delete({ id: userId });
        return { successful: true, userFound: true };
    }

    public static async registerUser(username: string, passwordRaw: string)
    {
        if (await UserService.checkUserNameTaken(username)) return new UserNameTakenError(username);
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