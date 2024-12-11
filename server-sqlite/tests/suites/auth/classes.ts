import { IsString } from "class-validator";
import { PostUserAPI } from "../../../../api-types/user.js";
import { PostLoginAPI } from "../../../../api-types/auth.js";
import { IsUTCDateInt } from "../../../server_source/db/validators.js";

export namespace PostUserAPIClass
{
    export class RequestDTO implements PostUserAPI.RequestDTO
    {
        @IsString() username: string;
        @IsString() password: string;
    }

    export class ResponseDTO implements PostUserAPI.ResponseDTO
    {
        @IsString() userid: string;
    }
}

export namespace PostLoginAPIClass
{
    export class RequestDTO implements PostLoginAPI.RequestDTO
    {
        @IsString() username: string;
        @IsString() password: string;
    }

    export class ResponseDTO implements PostLoginAPI.ResponseDTO
    {
        @IsString() token: string;
        @IsUTCDateInt() creationDate: number;
        @IsUTCDateInt() expiryDate: number;
        @IsString() owner: string;
    }
}