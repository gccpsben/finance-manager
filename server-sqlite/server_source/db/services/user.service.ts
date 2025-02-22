import argon2 from "argon2";
import { UserRepository } from "../repositories/user.repository.ts";
import { keyNameOfUser } from "../entities/user.entity.ts";
import { MonadError } from "../../std_errors/monadError.ts";
import { Database } from "../db.ts";
import { UserCache } from '../caches/user.cache.ts';
import { UUID } from "node:crypto";

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
    public static async getUserById(
        userId: UUID,
        cache: UserCache | null
    )
    {
        if (cache)
        {
            const cacheResult = cache.queryUserById(userId);
            if (cacheResult)
            {
                return {
                    id: cacheResult.id,
                    username: cacheResult.name
                }
            }
        }

        const result = await UserRepository
        .getInstance()
        .createQueryBuilder('user')
        .where(`"user".${keyNameOfUser('id')} = :id`, { id: userId })
        .getOne() ?? null;

        if (result !== null && !!cache)
            cache.cacheUser({ id: result.id, name: result.username });

        return result === null ? null : {
            id: result.id as UUID,
            username: result.username
        };
    }

    public static async findAllUsers()
    {
        return await UserRepository.
        getInstance().
        find({ select: { passwordHash: false } });
    }

    public static async tryDeleteUser(
        userId: UUID,
        cache: UserCache | null
    ): Promise<{successful: boolean, userFound: boolean}>
    {
        cache?.invalidateUser(userId);
        const targetUser = await UserRepository.getInstance().findOne({ where: { id: userId } });
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