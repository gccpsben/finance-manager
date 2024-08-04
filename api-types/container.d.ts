export type ContainerDTO =
{
    id: string;
    name: string;
    creationDate: string;
    owner: string;
}

export type GetContainerDTO = { };
export type ResponseGetContainerDTO = ContainerDTO[];

export type PostContainerDTO = { name: string; };
export type ResponsePostContainerDTO = { id: string; };