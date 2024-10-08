import { API_NET_WORTH_GRAPH_PATH } from "@/apiPaths";
import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { defineStore } from "pinia"
import type { GetUserNetworthHistoryAPI } from "../../../../../api-types/calculations";
import { ref } from "vue";

export const useNetworthHistoryStore = defineStore('networthHistory', () => 
{
    const _30d = ref(useNetworkRequest<GetUserNetworthHistoryAPI.ResponseDTO>
    (
        {
            url: `${API_NET_WORTH_GRAPH_PATH}`,
            query: { startDate: `${Date.now() - 2_592_000_000}` }
        },
        {
            autoResetOnUnauthorized: true,
            includeAuthHeaders: true,
            updateOnMount: false,
        }
    ));
    const _all = ref(useNetworkRequest<GetUserNetworthHistoryAPI.ResponseDTO>
    (
        `${API_NET_WORTH_GRAPH_PATH}`,
        {
            autoResetOnUnauthorized: true,
            includeAuthHeaders: true,
            updateOnMount: false,
        }
    ));
    const _7d = ref(useNetworkRequest<GetUserNetworthHistoryAPI.ResponseDTO>
    (
        {
            url: `${API_NET_WORTH_GRAPH_PATH}`,
            query: { startDate: `${Date.now() - 604_800_000}` }
        },
        {
            autoResetOnUnauthorized: true,
            includeAuthHeaders: true,
            updateOnMount: false,
        }
    ));

    return {
        _30d: _30d,
        _7d: _7d,
        _all: _all
    }
})