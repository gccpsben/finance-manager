import { API_BAL_VAL_PATH, API_GRAPHS_PATH, API_NET_WORTH_GRAPH_PATH, API_SUMMARY_PATH, API_TRANSACTIONS_PATH, API_TXN_TYPES_PATH, API_USER_INCOMES_EXPENSES_PATH } from '@/apiPaths';
import { useNetworkRequest } from '../composables/useNetworkRequest';
import type { DashboardSummary } from '@/types/dtos/dashboardSummaryDTO';
import axios, { AxiosError } from 'axios';
import { defineStore } from 'pinia';
import type { GraphsSummary } from '@/types/dtos/graphsSummaryDTO';
import type { ResponseGetExpensesAndIncomesDTO } from "@/../../api-types/calculations";
import type { GetTxnAPI } from '../../../../../api-types/txn';
import router from '@/router';

export type Subpage = { name: string; }

export type PageDefinition =
{
    name:string;
    displayName:string;
    iconClass:string;
    isExpanded: boolean;
    subpages: Subpage[];
}

export class NavBarItem { type: string = "folder"; }

export type NetWorthAPIResponse =
{
    "netWorthHistory": {[timestamp:string]:number},
    "netWorthActualHistory": {[timestamp:string]:number}
};

export type BalanceValueHistoryAPIResponse =
{
    timestamps: string[],
    balance: {[currencyPubID:string]: number[]},
    balanceActual: {[currencyPubID:string]: number[]}
};

export const useMainStore = defineStore(
{
    id: 'mainStore',
    state: () =>
    (
        {
            availablePages:
            [
                {
                    name: "dashboard",
                    displayName: "Dashboard",
                    iconClass: "fa fa-dashboard"
                },
                {
                    name: "currencies",
                    displayName: "Currencies",
                    iconClass: "fa fa-usd"
                },
                {
                    name: "charts",
                    displayName: "Charts",
                    iconClass: "fa fa-line-chart"
                },
                {
                    name: "transactions",
                    displayName: "Transactions",
                    iconClass: "fa fa-credit-card-alt"
                },
                {
                    name: "containers",
                    displayName: "Containers",
                    iconClass: "fa fa-inbox"
                }
            ] as PageDefinition[],
            userExpensesIncomes: useNetworkRequest<ResponseGetExpensesAndIncomesDTO>(API_USER_INCOMES_EXPENSES_PATH, { includeAuthHeaders: true, updateOnMount: false }),
            dashboardSummary: useNetworkRequest<DashboardSummary>(API_SUMMARY_PATH, { includeAuthHeaders: true, updateOnMount: false }),
            graphsSummary: useNetworkRequest<GraphsSummary>(API_GRAPHS_PATH, { includeAuthHeaders: true, updateOnMount: false }),
            balanceValueHistory: useNetworkRequest<BalanceValueHistoryAPIResponse>(API_BAL_VAL_PATH, { includeAuthHeaders: true, updateOnMount: false }),

            txns30d: useNetworkRequest<GetTxnAPI.ResponseDTO>(`${API_TRANSACTIONS_PATH}?startDate=${Date.now() - 2.628e+9}`, { includeAuthHeaders: true, updateOnMount: false }),
            // containers: useNetworkRequest<GetContainerAPI.ResponseDTO>(API_CONTAINERS_PATH, { includeAuthHeaders: true }),
            // txnTypes: useNetworkRequest<GetTxnTypesAPI.ResponseDTO>(API_TXN_TYPES_PATH, { includeAuthHeaders: true }),
            netWorthHistory: useNetworkRequest<NetWorthAPIResponse>(API_NET_WORTH_GRAPH_PATH, { includeAuthHeaders: true, updateOnMount: false }),
            lastUpdateTime: new Date(0) as Date,
            mainViewSidebarVisible: true
        }
    ),
    getters:
    {

    },
    actions:
    {
        /** A batch endpoint is available at backend. The endpoint combines dashboardSummary, containers, currencies and netWorth into a single endpoint. */
        async updateDashboardBatch()
        {
            // const request = useNetworkRequest<DashboardBatchDTO>(API_DASHBOARD_BATCH_PATH,
            // {
            //     autoResetOnUnauthorized: true,
            //     includeAuthHeaders: true,
            //     updateOnMount: false
            // });
            // this.dashboardSummary.isLoading = true;
            // this.containers.isLoading = true;
            // this.currencies.isLoading = true;
            // await request.updateData();
            // if (request.lastSuccessfulData.value)
            // {
            //     this.netWorthHistory.lastSuccessfulData = request.lastSuccessfulData.value!.netWorth;
            //     this.dashboardSummary.lastSuccessfulData = request.lastSuccessfulData.value!.summary;
            //     this.currencies.lastSuccessfulData = request.lastSuccessfulData.value!.currenciesHydrated;
            //     this.containers.lastSuccessfulData = request.lastSuccessfulData.value!.containersHydrated;
            // }
            // this.dashboardSummary.isLoading = false;
            // this.containers.isLoading = false;
            // this.currencies.isLoading = false;
        },
        async updateAll()
        {
            if (new Date().getTime() - this.lastUpdateTime.getTime() < 10000) return;
            await Promise.all(
            [
                this.dashboardSummary.updateData(),
                // this.containers.updateData(),
                // this.txnTypes.updateData(),
                this.netWorthHistory.updateData(),
                this.balanceValueHistory.updateData()
            ]);

            this.lastUpdateTime = new Date();
        },
        resetAuth()
        {
            this.clearCookie("jwt");
            router.push("/login");
        },
        async authGet(url:string, extraHeaders:{[key: string]: string}={})
        {
            let headers = {headers: { "Authorization": this.getCookie("jwt"), ...extraHeaders }};
            let response = await axios.get(url, headers);
            if (response.status === 401) this.resetAuth();
            return response;
        },
        async authPost(url:string, body:Object={}, extraHeaders:{[key: string]: string}={})
        {
            let headers = { headers: { "Authorization": this.getCookie("jwt"), ...extraHeaders } };
            return axios.post(url, body, headers).catch((error: any) =>
            {
                if (error.response && error.response.status == 401 && axios.isAxiosError(error))
                {
                    this.resetAuth();
                    throw error as AxiosError;
                }
                else throw error as any;
            });
        },
        // async updateNetWorthHistory()
        // {
        //     let response = await this.authGet(API_NET_WORTH_GRAPH_PATH);
        //     this.netWorthHistory = response!.data;
        // },
        // async updateBalanceValueHistory()
        // {
        //     let response = await this.authGet(API_BAL_VAL_PATH);
        //     this.balanceValueHistory = response!.data;
        // },
        setCookie(cname:string, cvalue:string, exdays:number): void
        {
            const d = new Date();
            d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
            let expires = "expires=" + d.toUTCString();
            document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        },
        getCookie(cname: string): string
        {
            let name = cname + "=";
            let ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++)
            {
                let c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1);
                if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
            }
            return "";
        },
        clearCookie(cname:string) : void
        {
            this.setCookie(cname, "", -1);
        },

        toSorted<T>(array:Array<T>, func:(a:T, b:T) => number)
        {
            let newArray = [...array];
            return newArray.sort(func);
        },

        toReversed<T>(array:Array<T>)
        {
            let newArray = [...array];
            return newArray.reverse();
        },
    }
})