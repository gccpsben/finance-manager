import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { defineStore } from "pinia";
import type { GetTxnTagsAPI } from "@/../../api-types/txnTag";
import { API_TXN_TAGS_PATH } from "@/apiPaths";

export const useTxnTagsStore = defineStore
(
    {
        id: 'txnTagsStore',
        state: () =>
        (
            {
                txnTags: useNetworkRequest<GetTxnTagsAPI.ResponseDTO>(API_TXN_TAGS_PATH, { includeAuthHeaders: true }),
            }
        ),
        actions:
        {
            tagIdToName(id: string): string | null
            {
                return this.txnTags.lastSuccessfulData?.rangeItems.find(x => x.id === id)?.name ?? null;
            }
        }
    }
);