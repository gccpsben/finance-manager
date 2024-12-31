import { API_CURRENCIES_PATH } from "@/apiPaths";
import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { defineStore } from "pinia";
import type { GetCurrencyAPI } from "../../../../../api-types/currencies";
import type { GetTxnAPI } from "../../../../../api-types/txn";
import { getTxnClassification } from "@/modules/transactions/utils/transactions";

export const useCurrenciesStore = defineStore
(
    {
        id: 'currenciesStore',
        state: () =>
        (
            {
                currencies: useNetworkRequest<GetCurrencyAPI.ResponseDTO>
                (
                    API_CURRENCIES_PATH,
                    { includeAuthHeaders: true }
                ),
            }
        ),
        actions:
        {
            formatAmount(txn: GetTxnAPI.TxnDTO): string
            {
                // TODO: Think of a better way to display data instead of just showing change in value?
                if (!this.currencies.lastSuccessfulData) return "...";
                if (this.currencies.lastSuccessfulData.rangeItems.length == 0) return "...";
                const delta = parseFloat(txn.changeInValue);
                if (delta > 0) return `+ ${delta}`;
                else return `- ${delta}`;
            },
            findCurrencyByPubID(id:string)
            {
                if (!this.currencies.lastSuccessfulData) return undefined;
                return this.currencies.lastSuccessfulData.rangeItems.find(x => x.id == id);
            },
            getValue(currencyID: string, amount: number)
            {
                if (!this.currencies.lastSuccessfulData) return "...";
                if (this.currencies.lastSuccessfulData.rangeItems.find(x => x.id == currencyID) == undefined)
                    console.log(`Unknown currency ${currencyID} found.`);
                const rateToBase = this.currencies.lastSuccessfulData.rangeItems.find(x => x.id == currencyID)?.rateToBase ?? "0";
                return amount * parseFloat(rateToBase);
            },
            getCurrencyName(currencyId: string): string | "..."
            {
                if (!this.currencies.lastSuccessfulData) return "...";
                return this.currencies.lastSuccessfulData.rangeItems.find(x => x.id == currencyId)?.name ?? '...';
            },
            getCurrencySymbol(currencyId: string): string | "..."
            {
                if (!this.currencies.lastSuccessfulData) return "...";
                return this.currencies.lastSuccessfulData.rangeItems.find(x => x.id == currencyId)?.ticker ?? '...';
            },
            getBaseCurrencySymbol(): string | "..."
            {
                if (!this.currencies.lastSuccessfulData) return "...";
                return this.currencies.lastSuccessfulData.rangeItems.find(x => x.isBase)?.ticker ?? "...";
            }
        }
    }
);