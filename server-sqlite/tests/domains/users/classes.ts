// deno-lint-ignore-file no-namespace
import { IsString } from "class-validator";
import { PostUserAPI } from "../../../../api-types/user.d.ts";

export namespace PostUserAPIClass
{
    export class RequestDTO implements PostUserAPI.RequestDTO
    {
        @IsString() username!: string;
        @IsString() password!: string;
    }

    export class ResponseDTO implements PostUserAPI.ResponseDTO
    {
        @IsString() userid!: string;
    }
}