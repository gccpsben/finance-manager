import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { defineStore } from "pinia";
import type { GetTxnTagsResponseBody } from "@/../../../api_types/GetTxnTagsResponseBody";
import { API_TXN_TAGS_PATH } from "@/apiPaths";

export const useTxnTagsStore = defineStore
(
    {
        id: 'txnTagsStore',
        state: () =>
        (
            {
                txnTags: useNetworkRequest<GetTxnTagsResponseBody>(API_TXN_TAGS_PATH, { includeAuthHeaders: true }),
            }
        ),
        actions:
        {
            tagIdToName(id: string): string | null
            {
                return this.txnTags.lastSuccessfulData?.tags.find(x => x.id === id)?.name ?? null;
            }
        }
    }
);