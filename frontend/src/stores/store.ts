import axios from 'axios';
import { defineStore } from 'pinia'

export class Currency
{
    name: string = "";
    symbol: string = "";
    rate: number = 0;
    id: string = "";
    
    constructor(id:string, name:string, symbol:string, rate:number)
    {
        this.id = id;
        this.name = name; this.symbol = symbol; this.rate = rate;
    }
}

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
            ],
            allTransactions: [],
            dashboardSummary: {} as any,
            currencies: [] as Array<Currency>
        }
    ),
    getters: 
    {
    
    },
    actions: 
    {
        async updateAll()
        {
            await this.updateTransactions();
            await this.updateDashboardSummary();
            await this.updateCurrencies();
        },
        resetAuth()
        {
            this.clearCookie("jwt");
            this.$router.push("/login");
        },
        async authGet(url:string)
        {
            var headers = {headers: { "Authorization": this.getCookie("jwt") }};
            return axios.get(url, headers).catch(error => 
            {
                this.resetAuth();
                throw error;
            });
        },
        async updateDashboardSummary()
        {
            var self = this;
            var response = await self.authGet("/api/finance/summary");
            self.dashboardSummary = response.data;
        },
        async updateTransactions()
        {
            var self = this;
            var response = await self.authGet("/api/finance/transactions");
            self.allTransactions = response.data;
        },
        async updateCurrencies()
        {
            var self = this;
            var response = await self.authGet("/api/finance/currencies");
            self.currencies = response.data.map((currency:any) => 
            {
                return new Currency(currency["_id"], currency["name"], currency["symbol"], currency["rate"])
            });
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
            var symbol = this.currencies.find(c => c.id == transactionRecord[side]["amount"]["currencyID"]);
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
        }
    }
})