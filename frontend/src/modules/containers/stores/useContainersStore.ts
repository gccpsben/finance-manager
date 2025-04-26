import { API_CONTAINERS_PATH, API_CURRENCIES_PATH } from "@/apiPaths";
import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { defineStore } from "pinia";
import type { GetAccountResponse } from "@/../../../api_types/GetAccountResponse";

export const useContainersStore = defineStore
(
    {
        id: 'containersStore',
        state: () =>
        (
            {
                containers: useNetworkRequest<GetAccountResponse>(API_CONTAINERS_PATH, { includeAuthHeaders: true }),
            }
        ),
        actions:
        {
            findContainerById(id:string)
            {
                if (this.containers.isLoading) return undefined;
                if (!this.containers.lastSuccessfulData) return undefined;
                return this.containers.lastSuccessfulData.items.find(x => x.accountId == id);
            },

            isContainerExist(id:string) { return this.findContainerById(id) != undefined; }
        }
    }
);