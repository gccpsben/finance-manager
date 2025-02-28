import { API_CONTAINERS_PATH, API_CURRENCIES_PATH } from "@/apiPaths";
import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { defineStore } from "pinia";
import type { GetContainerAPI } from "@/../../api-types/container";

export const useContainersStore = defineStore
(
    {
        id: 'containersStore',
        state: () =>
        (
            {
                containers: useNetworkRequest<GetContainerAPI.ResponseDTO>(API_CONTAINERS_PATH, { includeAuthHeaders: true }),
            }
        ),
        actions:
        {
            findContainerById(id:string)
            {
                if (this.containers.isLoading) return undefined;
                if (!this.containers.lastSuccessfulData) return undefined;
                return this.containers.lastSuccessfulData.rangeItems.find(x => x.id == id);
            },

            isContainerExist(id:string) { return this.findContainerById(id) != undefined; }
        }
    }
);