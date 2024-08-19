import { PaginationAPIResponse } from "./lib"

export type ContainerDTO =
{
    id: string;
    name: string;
    creationDate: number;
    owner: string;
}

export type ValueHydratedContainerDTO = ContainerDTO & { value: string; }
export type BalancesHydratedContainerDTO = ContainerDTO & { balances: { [currencyId: string]: string; } };

export namespace GetContainerAPI
{
    export type RequestDTO = { };
    export type ResponseDTO = 
    {
        /** What date will the currency rate be calculated against. */
        rateCalculatedToEpoch: number
    } & PaginationAPIResponse<ValueHydratedContainerDTO & BalancesHydratedContainerDTO>;
}

export namespace PostContainerAPI
{
    export type RequestDTO = { name: string; };
    export type ResponseDTO = { id: string; };
}