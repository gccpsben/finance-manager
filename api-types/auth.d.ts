export namespace PostLoginAPI
{
    export type RequestDTO =
    {
        username: string;
        password: string;
    }

    export type ResponseDTO = 
    {
        token: string;
        creationDate: number;
        expiryDate: number;
        owner: string;
    }
}