import { API_BAL_VAL_PATH, API_CONTAINERS_PATH, API_CURRENCIES_PATH, API_GRAPHS_PATH, API_NET_WORTH_GRAPH_PATH, API_SUMMARY_PATH, API_TXN_TYPES_PATH } from '@/apiPaths';
import { useNetworkRequest } from '@/composables/useNetworkRequest';
import type { ValueHydratedContainer } from '@/types/dtos/containersDTO';
import type { RateDefinedCurrency } from '@/types/dtos/currenciesDTO';
import type { DashboardSummary } from '@/types/dtos/dashboardSummaryDTO';
import type { TxnType } from '@/types/dtos/txnTypesDTO';
import axios, { AxiosError } from 'axios';
import { defineStore } from 'pinia'

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
            dashboardSummary: useNetworkRequest<DashboardSummary>(API_SUMMARY_PATH, { includeAuthHeaders: true }),
            graphsSummary: useNetworkRequest<GraphsSummary>(API_GRAPHS_PATH, { includeAuthHeaders: true }),
            currencies: useNetworkRequest<RateDefinedCurrency[]>(API_CURRENCIES_PATH, { includeAuthHeaders: true }),
            containers: useNetworkRequest<ValueHydratedContainer[]>(API_CONTAINERS_PATH, { includeAuthHeaders: true }),
            txnTypes: useNetworkRequest<TxnType[]>(API_TXN_TYPES_PATH, { includeAuthHeaders: true }),
            netWorthHistory: { "netWorthHistory": {}, "netWorthActualHistory": {} } as NetWorthAPIResponse,
            balanceValueHistory: {} as BalanceValueHistoryAPIResponse,
            lastUpdateTime: new Date(0) as Date
        }
    ),
    getters: 
    {
    
    },
    actions: 
    {
        async updateAll()
        {
            if (new Date().getTime() - this.lastUpdateTime.getTime() < 10000) return;
            await Promise.all(
            [
                // this.updateTransactions(),
                this.dashboardSummary.updateData(),
                this.currencies.updateData(),
                this.containers.updateData(),
                this.txnTypes.updateData(),
                this.updateNetWorthHistory(),
                this.updateBalanceValueHistory()
            ]);

            this.lastUpdateTime = new Date();
        },
        resetAuth()
        {
            this.clearCookie("jwt");
            this.$router.push("/login");
        },
        async authGet(url:string, extraHeaders:{[key: string]: string}={})
        {
            let headers = {headers: { "Authorization": this.getCookie("jwt"), ...extraHeaders }};
            return axios.get(url, headers).catch(error => 
            {
                if (error.response && error.response.status == 401)
                {
                    this.resetAuth();
                    throw error;
                }
            });
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
        async updateNetWorthHistory()
        {
            let response = await this.authGet(API_NET_WORTH_GRAPH_PATH);
            this.netWorthHistory = response!.data;
        },
        async updateBalanceValueHistory()
        {
            let response = await this.authGet(API_BAL_VAL_PATH);
            this.balanceValueHistory = response!.data;
        },
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
        formatAmount(transactionRecord:any, side:"to"|"from"="to")
        {
            if (transactionRecord == undefined) return "";
            if (!this.currencies.lastSuccessfulData) return "";
            if (this.currencies.lastSuccessfulData.length == 0 || transactionRecord[side] == undefined) return "";
            let symbol = this.currencies.lastSuccessfulData.find(c => c.pubID == transactionRecord[side]["amount"]["currencyID"]);
            return `${transactionRecord[side]["amount"]["value"].toFixed(2)} ${symbol?.symbol}`
        },

        /**
         * Get the passed time of a date relative to current time.
         */
        getDateAge(dateString:string)
        {
            let msDiff = Date.now() - Date.parse(dateString);
            if (msDiff < 60000) return `${(msDiff / 1000).toFixed(0)}s`; // if < 1 min
            else if (msDiff < 3.6e+6) return `${(msDiff / 60000).toFixed(0)}m`; // if < 1 hour
            else if (msDiff < 8.64e+7) return `${(msDiff / (3.6e+6)).toFixed(0)}h`; // if < 1 day
            else return `${(msDiff / (8.64e+7)).toFixed(0)}d`;
        },
        
        getCurrencyName(currencyPubID: string)
        {
            if (!this.currencies.lastSuccessfulData) return "";
            return this.currencies.lastSuccessfulData.find(x => x.pubID == currencyPubID)?.name;
        },
        
        getCurrencySymbol(currencyPubID: string)
        {
            if (!this.currencies.lastSuccessfulData) return "";
            return this.currencies.lastSuccessfulData.find(x => x.pubID == currencyPubID)?.symbol;
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
        
        getValue(currencyID: string, amount: number) 
        {
            if (!this.currencies.lastSuccessfulData) return "";
            if (this.currencies.lastSuccessfulData.find(x => x.pubID == currencyID) == undefined) console.log(`Unknown currency ${currencyID} found.`);
            return amount * (this.currencies.lastSuccessfulData.find(x => x.pubID == currencyID)?.rate as number ?? 0);
        },

        findContainerByPubID(pubID:string) 
        {
            if (this.containers.isLoading) return undefined;
            if (!this.containers.lastSuccessfulData) return undefined;
            return this.containers.lastSuccessfulData.find(x => x.pubID == pubID); 
        },
        
        isContainerExist(pubID:string) { return this.findContainerByPubID(pubID) != undefined; },
        
        findCurrencyByPubID(pubID:string) 
        {
            if (!this.currencies.lastSuccessfulData) return undefined;
            return this.currencies.lastSuccessfulData.find(x => x.pubID == pubID); 
        }
    }
})