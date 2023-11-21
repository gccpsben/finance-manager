import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { AccountClassModel } from "./account";
import { v4 as uuidv4 } from 'uuid';
import { isDevelopment } from "../server";

let jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;

@modelOptions ( { schemaOptions: { autoCreate: true, collection:"accessTokens" } } )
export class AccessTokenClass
{
    @prop( {required:true} )
    public userID!: string;

    @prop( {required:true} )
    public username!: string;

    @prop( {required:true} )
    public token!: string;
    
    @prop( {required:true} )
    public useragent!: string;

    @prop( {required:true} )
    public issueTime!: Date;

    @prop( {required:false, default: 0} )
    public accessCount!: number;

    @prop( {required:false} )
    public lastAccessTime!: Date;

    public async generateJWTBearer() : Promise<string>
    {
        let ownerAccount = await AccountClassModel.findOne({username: this.username});
        if (ownerAccount == undefined) throw "Account not found";

        // sign a JWT, with the username-token pair, using password hash as the secret key
        return await jwt.sign(
        {
            "username": this.username,
            "token": this.token
        }, jwtSecret);
    }

    public static async isJWTAuthenticated(requestedJWTToken:string) : Promise<boolean>
    {
        try
        {
            if (requestedJWTToken.startsWith("Bearer ")) requestedJWTToken = requestedJWTToken.replace("Bearer ", "");
            let jwtContent = await jwt.verify(requestedJWTToken, jwtSecret);
            let isTokenValid = await AccessTokenClass.isTokenValid(jwtContent.username, jwtContent.token);
            if (isTokenValid) return true;
            else return false;
        }
        catch(ex) 
        { 
            if (ex.name == "JsonWebTokenError") return false;
            else return false; 
        }
    }

    // Return wether the request is from a logged-in user. 
    // Notice that this doesn't check if the user has access to the resources or not.
    public static async isRequestAuthenticated(expressReqObject:any) : Promise<boolean>
    {
        try
        {
            if (isDevelopment) return true;

            let rawAuthHeader: string = expressReqObject.get("Authorization");
            if (!rawAuthHeader.startsWith("Bearer ")) { return false; }
            let requestedJWTToken = rawAuthHeader.split(" ")[1];
            let jwtContent = await jwt.verify(requestedJWTToken, jwtSecret);
            let isTokenValid = await AccessTokenClass.isTokenValid(jwtContent.username, jwtContent.token);
             
            // {
            //     res.status(401);
            //     res.json({"error": "Invalid token"});
            // }
            if (isTokenValid) return true;
            else return false;
        }
        catch(ex) 
        { 
            if (ex.name == "JsonWebTokenError") return false;
            else return false; 
        }
    }

    // Check if a given access token is valid
    // by calling this method, access token will be considered accessed.
    public static async isTokenValid(username:string, token:string) : Promise<boolean>
    {
        let accessTokenClassInDB = await AccessTokenClassModel.findOne({ token: token });
        if (accessTokenClassInDB == undefined) return false;
        if (accessTokenClassInDB.username != username) return false;
        accessTokenClassInDB.lastAccessTime = new Date();
        accessTokenClassInDB.accessCount += 1;
        await accessTokenClassInDB.save();
        return true;
    }

    public static async issueToken(username: string, useragent: string): Promise<AccessTokenClass>
    {
        let ownerAccount = await AccountClassModel.findOne({username: username});
        if (ownerAccount == undefined) throw "Account not found";

        let newAccessToken = uuidv4();
        let newTokenClass = new AccessTokenClassModel(
        {
            token: newAccessToken, 
            useragent: useragent,
            issueTime: new Date(),
            lastAccessTime: new Date(),
            userID: ownerAccount._id,
            username: username
        });

        // if (ownerAccount.accessTokens == undefined) ownerAccount.accessTokens = new mongoose.Types.Array<AccessTokenClass>();
        // ownerAccount.accessTokens.push(newTokenClass);
        await newTokenClass.save();

        return newTokenClass;
    }
}
export const AccessTokenClassModel = getModelForClass(AccessTokenClass);
