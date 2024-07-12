import { getModelForClass, modelOptions, mongoose, prop } from "@typegoose/typegoose";
import { AccessTokenClass } from "./accessToken";

import bcrypt = require('bcrypt');
const saltRounds = 10;

@modelOptions ( { schemaOptions: { autoCreate: false, collection: "accounts" }, existingMongoose: mongoose   } )
export class AccountClass
{
    @prop({required:true})
    public username!: string;

    @prop({required:true})
    public passwordHash!: string;

    @prop({required:true})
    public registerTime!: Date;

    // @prop({required:false, default: [], type: AccessTokenClass})
    // public accessTokens!: mongoose.Types.Array<AccessTokenClass>;

    public static async register(username:string, passwordRaw: string) : Promise<AccountClass>
    {
        if (!username) throw "Username cannot be undefined";
        if (!passwordRaw) throw "Password did not pass vaildation";

        else if (username.length <= 1 || !username) throw "Username did not pass vaildation";
        else
        {
            // check if name already taken
            let accountsWithSameName = await AccountClassModel.find({username: username});
            if (accountsWithSameName.length > 0) throw "Username taken";

            let pwHash = await bcrypt.hash(passwordRaw, saltRounds);
            return await new AccountClassModel(
            {
                username: username,
                passwordHash: pwHash,
                registerTime: new Date()
            }).save();
        } 
    }

    public static async login(username:string, passwordRaw:string, useragent:string) : Promise<AccessTokenClass>
    {
        const failMessage = "Username or password don't match";
        let accountsWithSameName = await AccountClassModel.find({username:username});
        if (accountsWithSameName.length == 0) throw failMessage;
        else if (accountsWithSameName.length > 1) { console.log("Account with the same username detected!"); throw failMessage; }
        else
        {
            let accountToLogin = accountsWithSameName[0];
            if (await bcrypt.compare(passwordRaw, accountToLogin.passwordHash)) return await AccessTokenClass.issueToken(username, useragent);
            else throw failMessage;
        }
    }

}
export const AccountClassModel = getModelForClass(AccountClass);