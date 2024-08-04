export type PostLoginDTO = 
{
    username: string;
    password: string;
};
export type ResponsePostLoginDTO =
{
    token: string;
    creationDate: string;
    expiryDate: string;
    owner: string;
};