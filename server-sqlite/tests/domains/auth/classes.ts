// deno-lint-ignore-file no-namespace
import { IsString } from "class-validator";
import { PostLoginAPI } from "../../../../api-types/auth.d.ts";
import { IsUTCDateInt } from "../../lib/validators.ts";

export namespace PostLoginAPIClass
{
    export class RequestDTO implements PostLoginAPI.RequestDTO
    {
        @IsString() username!: string;
        @IsString() password!: string;
    }

    export class ResponseDTO implements PostLoginAPI.ResponseDTO
    {
        @IsString() token!: string;
        @IsUTCDateInt() creationDate!: number;
        @IsUTCDateInt() expiryDate!: number;
        @IsString() owner!: string;
    }
}