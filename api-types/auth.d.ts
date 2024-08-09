export type PostLoginDTO = 
{
    username: string;
    password: string;
};
export type ResponsePostLoginDTO =
{
    token: string;
    creationDate: number;
    expiryDate: number;
    owner: string;
};