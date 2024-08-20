import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { defineStore } from "pinia";
import type { GetTxnTypesAPI } from "@/../../api-types/txnType";
import { API_TXN_TYPES_PATH } from "@/apiPaths";

export const useTxnTypesStore = defineStore
(
    {
        id: 'txnTypesStore',
        state: () => 
        (
            {
                txnTypes: useNetworkRequest<GetTxnTypesAPI.ResponseDTO>(API_TXN_TYPES_PATH, { includeAuthHeaders: true }),
            }
        )
    }
);