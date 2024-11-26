import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import type { GetCurrencyRateSrcAPI } from "../../../../../api-types/currencyRateSource.d";
import { readonly, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

export function useGetCurrencyRateSources
(
    targetCurrencyId: MaybeRefOrGetter<string|undefined>,
    autoUpdateOnChange: boolean = true
)
{
    const networkRequest = useNetworkRequest<GetCurrencyRateSrcAPI.ResponseDTO>
    (
        "",
        { includeAuthHeaders: true, updateOnMount: false }
    );

    watch(() => targetCurrencyId, (newVal, _oldVal) =>
    {
        const targetCurrId = toValue(newVal);
        if (!targetCurrId) return;
        const targetUrl = `/api/v1/${targetCurrId}/currencyRateSources` satisfies GetCurrencyRateSrcAPI.Path<string>;
        networkRequest.setQueryObj(`${targetUrl}`);
        if (!autoUpdateOnChange) networkRequest.updateData();
    }, { immediate: true });

    return {
        isLoading: readonly(networkRequest.isLoading),
        reqError: readonly(networkRequest.error),
        lastSuccessfulData: readonly(networkRequest.lastSuccessfulData),
        update: networkRequest.updateData,
        networkRequest
    }
}