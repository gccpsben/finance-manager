import { PaginationAPIResponse } from "./lib.d.ts"

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

export namespace GetContainerTimelineAPI
{
    export type Path<Params extends string> = `/api/v1/containers/timeline${Params}`;

    export type FragmentDTO =
    {
        fromAmount: string | null;
        fromCurrencyId: string | null;
        fromContainerId: string | null;
        toAmount: string | null;
        toCurrencyId: string | null;
        toContainerId: string | null;
    };

    export type RequestQueryDTO =
    {
        containerId: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        division?: string | undefined;
    };

    export type RequestDTO = { };
    export type ResponseDTO =
    {
        timeline: {
            [epoch: string]:
            {
                containerBalance: { [currId: string]: string },
                containerWorth: string
            }
        }
    };
}