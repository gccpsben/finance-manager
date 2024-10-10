<template>
    <div class="fullSize">
        <template v-if="datumResponse.isLoading.value || datumResponse.error.value">
            <NetworkCircularIndicator :error="datumResponse.error.value" :is-loading="datumResponse.isLoading.value" class="fullSize center"/>
        </template>
        <template v-else-if="parsedDatums?.length == 0">
            <div class="fullSize center">
                <div style="opacity: 0.5">N/A</div>
            </div>
        </template>
        <template v-else>
            <WrappedLineChart :show-axis-labels="false" :is-x-axis-epoch="true" :datums="parsedDatums"></WrappedLineChart>
        </template>
    </div>
</template>

<script lang="ts" setup>
import WrappedLineChart from '@/modules/core/components/wrappedLineChart.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetCurrencyRateHistoryAPI } from '@/../../api-types/currencies';
import { API_CURRENCY_RATE_HISTORY_PATH } from '@/apiPaths';
import { computed, watch } from 'vue';
import NetworkCircularIndicator from '@/modules/core/components/networkCircularIndicator.vue';

const props = withDefaults(defineProps<{ currencyId: string, rangeMs?: number }>(), { rangeMs: 604_800_000 });
const baseQueryObj =
{
    query: { id: props.currencyId },
    url: `${API_CURRENCY_RATE_HISTORY_PATH}`
};
const datumResponse = useNetworkRequest<GetCurrencyRateHistoryAPI.ResponseDTO>
(
    baseQueryObj,
    {
        autoResetOnUnauthorized: true,
        includeAuthHeaders: true,
        updateOnMount: false
    }
);

watch([() => props.currencyId, () => props.rangeMs], () =>
{
    const queryStartEpoch = Date.now() - props.rangeMs;
    datumResponse.setQueryObj(
    {
        ...baseQueryObj,
        query: { ...baseQueryObj.query, startDate: `${queryStartEpoch}` }
    });
    return datumResponse.updateData();

}, { immediate: true });

const parsedDatums = computed(() =>
{
    const apiResponse = datumResponse.lastSuccessfulData;
    const datums = apiResponse.value?.datums ?? [];
    return datums.map(d => (
    {
        x: d.date,
        y: parseFloat(d.value)
    }));
});

</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";
</style>