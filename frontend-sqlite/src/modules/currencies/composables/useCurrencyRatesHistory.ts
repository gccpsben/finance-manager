import type { GetCurrencyRateHistoryAPI } from '@/../../../api-types/currencies';
import { type MaybeRefOrGetter, readonly, toValue, watch } from "vue";
import { useNetworkRequest } from "../../core/composables/useNetworkRequest.ts";
import { API_CURRENCY_RATE_HISTORY_PATH } from '../../../apiPaths.ts';

export function useCurrencyRatesHistory
(
    targetCurrencyId: MaybeRefOrGetter<string|undefined>,
    startDate?: MaybeRefOrGetter<number | undefined>,
    endDate?: MaybeRefOrGetter<number | undefined>,
    autoUpdateOnChange: boolean = true
)
{
    const networkRequest = useNetworkRequest<GetCurrencyRateHistoryAPI.ResponseDTO>
    (
        "",
        { includeAuthHeaders: true, updateOnMount: false }
    );

    watch(() => targetCurrencyId, (newVal, _oldVal) =>
    {
        const startDateValue = toValue(startDate);
        const endDateValue = toValue(endDate);
        const targetCurrId = toValue(newVal);
        if (!targetCurrId) return;
        networkRequest.setQueryObj(
        {
            url: API_CURRENCY_RATE_HISTORY_PATH,
            query: {
                id: targetCurrId,
                ... (startDateValue === undefined ? {} : { startDate: `${startDateValue}` }),
                ... (endDateValue === undefined ? {} : { endDate: `${endDateValue}` })
            }
        });
        if (autoUpdateOnChange) networkRequest.updateData();
    }, { immediate: true });

    return {
        isLoading: readonly(networkRequest.isLoading),
        reqError: readonly(networkRequest.error),
        lastSuccessfulData: readonly(networkRequest.lastSuccessfulData),
        update: networkRequest.updateData,
        networkRequest
    }
}

/** Convert the data obtained from API, to a list of ``{ x: number, y: number }`` values. */
export const rateHistoryToDateValueList = (datums: Readonly<{ date: number, value: string }[]> | undefined | null) =>
{
    if (datums === undefined || datums === null) return [];
    return datums.map(x => ({
        x: x.date,
        y: parseFloat(x.value)
    }));
}