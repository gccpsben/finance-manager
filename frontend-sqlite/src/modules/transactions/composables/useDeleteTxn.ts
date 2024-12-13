import { useNetworkRequest, type NetworkQuery } from "@/modules/core/composables/useNetworkRequest";
import { computed, ref } from "vue";
import type { DeleteTxnAPI } from "../../../../../api-types/txn";
import { API_DELETE_TRANSACTIONS_PATH } from "@/apiPaths";

export function useDeleteTxn()
{
    const buildNetworkRequestQuery = (id: string): NetworkQuery => (
    {
        query: { "id": `${id}` },
        url: `${API_DELETE_TRANSACTIONS_PATH}`,
        method: "DELETE"
    });

    const deleteTxnRequest = useNetworkRequest<DeleteTxnAPI.ResponseDTO>
    (
        buildNetworkRequestQuery(''),
        {
            updateOnMount: false,
            autoResetOnUnauthorized: true,
            includeAuthHeaders: true
        },
    );

    const deleteTxn = async (txnId: string) =>
    {
        deleteTxnRequest.setQueryObj(buildNetworkRequestQuery(txnId));
        await deleteTxnRequest.updateData();
    };

    return {
        deleteTxn,
        txnDeletionError: computed(() => deleteTxnRequest.error.value),
        isTxnDeleting: computed(() => deleteTxnRequest.isLoading.value),
    };
};