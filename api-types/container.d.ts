import { PaginationAPIResponse } from "./lib"

export type ContainerDTO =
{
    id: string;
    name: string;
    creationDate: number;
    owner: string;
}

export namespace GetContainerAPI
{
    export type RequestDTO = { };
    export type ResponseDTO = PaginationAPIResponse<ContainerDTO>;
}

export namespace PostContainerAPI
{
    export type RequestDTO = { name: string; };
    export type ResponseDTO = { id: string; };
}