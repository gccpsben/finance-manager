import type { containers, currencies, totalValueHistory, transactionTypes, transactions } from '@prisma/client';
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

export const API_LOGIN_PATH = "./api/v1/finance/login";
export const API_SUMMARY_PATH = "/api/v1/finance/summary";
export const API_NET_WORTH_GRAPH_PATH = "/api/v1/finance/netWorth";
export const API_TRANSACTIONS_PATH = "/api/v1/finance/transactions";
export const API_CURRENCIES_PATH = "/api/v1/finance/currencies";
export const API_CONTAINERS_PATH = "/api/v1/finance/containers";
export const API_TXN_TYPES_PATH = "/api/v1/finance/transactionTypes";
export const API_GRAPHS_PATH = "/api/v1/finance/graphs";
export const API_BAL_VAL_PATH = "/api/v1/finance/balanceHistory";

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
            dashboardSummary: {} as any,
            graphsSummary: {} as any,
            currencies: [] as Array<currencies>,
            containers: [] as Array<containers>,
            txnTypes: [] as Array<transactionTypes>,
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
                this.updateDashboardSummary(),
                this.updateCurrencies(),
                this.updateContainers(),
                this.updateTxnTypes(),
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
        async authGet(url:string, extraHeaders:any={})
        {
            var headers = {headers: { "Authorization": this.getCookie("jwt"), ...extraHeaders }};
            return axios.get(url, headers).catch(error => 
            {
                if (error.response && error.response.status == 401)
                {
                    this.resetAuth();
                    throw error;
                }
            });
        },
        async authPost(url:string, body:any={}, extraHeaders:any={})
        {
            var headers = { headers: { "Authorization": this.getCookie("jwt"), ...extraHeaders } };
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
            var response = await this.authGet(API_NET_WORTH_GRAPH_PATH);
            this.netWorthHistory = response!.data;
        },
        async updateDashboardSummary()
        {
            let response = await this.authGet(API_SUMMARY_PATH);
            this.dashboardSummary = response!.data;
        },
        async updateCurrencies()
        {
            let response = await this.authGet(API_CURRENCIES_PATH);
            this.currencies = response!.data;
        },
        async updateBalanceValueHistory()
        {
            let response = await this.authGet(API_BAL_VAL_PATH);
            this.balanceValueHistory = response!.data;
        },
        async updateContainers()
        {
            var response = await this.authGet(API_CONTAINERS_PATH);
            this.containers = response!.data;
        },
        async updateTxnTypes()
        {
            var response = await this.authGet(API_TXN_TYPES_PATH);
            this.txnTypes = response!.data;
        },
        async updateGraphsSummary()
        {
            var response = await this.authGet(API_GRAPHS_PATH);
            this.graphsSummary = response!.data;
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
            if (this.currencies.length == 0 || transactionRecord[side] == undefined) return "";
            var symbol = this.currencies.find(c => c.pubID == transactionRecord[side]["amount"]["currencyID"]);
            return `${transactionRecord[side]["amount"]["value"].toFixed(2)} ${symbol?.symbol}`
        },

        /**
         * Get the passed time of a date relative to current time.
         */
        getDateAge(dateString:string)
        {
            var msDiff = Date.now() - Date.parse(dateString);
            if (msDiff < 60000) return `${(msDiff / 1000).toFixed(0)}s`; // if < 1 min
            else if (msDiff < 3.6e+6) return `${(msDiff / 60000).toFixed(0)}m`; // if < 1 hour
            else if (msDiff < 8.64e+7) return `${(msDiff / (3.6e+6)).toFixed(0)}h`; // if < 1 day
            else return `${(msDiff / (8.64e+7)).toFixed(0)}d`;
        },
        getCurrencyName(currencyPubID: string)
        {
            return this.currencies.find(x => x.pubID == currencyPubID)?.name;
        },
        getCurrencySymbol(currencyPubID: string)
        {
            return this.currencies.find(x => x.pubID == currencyPubID)?.symbol;
        },

        toSorted(array:Array<any>, func:any)
        {
            var newArray = [...array];
            return newArray.sort(func);
        },
        toReversed(array:Array<any>)
        {
            var newArray = [...array];
            return newArray.reverse();
        },
        getValue(currencyID: string, amount: number) 
        {
            if (this.currencies.find(x => x.pubID == currencyID) == undefined) console.log(`Unknown currency ${currencyID} found.`);
            return amount * (this.currencies.find(x => x.pubID == currencyID)?.rate as number ?? 0);
        },

        findContainerByPubID(pubID:string) { return this.containers.find(x => x.pubID == pubID); },
        isContainerExist(pubID:string) { return this.findContainerByPubID(pubID) != undefined; },
        findCurrencyByPubID(pubID:string) { return this.currencies.find(x => x.pubID == pubID); },

    }
})