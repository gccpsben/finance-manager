export namespace PostUserAPI
{
    export type RequestDTO = { username: string; password: string; };
    export type ResponseDTO = { userid: string; };
}

export namespace DeleteUserAPI
{
    export type RequestDTO = { userId: string; };
    export type ResponseDTO = {  };
}