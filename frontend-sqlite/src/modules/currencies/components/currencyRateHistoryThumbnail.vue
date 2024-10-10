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
            <OverlapArea class="fullSize rel">
                <AbsEnclosure :class="{'chartDisabled': isRateOutdated}">
                    <WrappedLineChart :show-axis-labels="false" :show-grid-lines="false" is-x-axis-epoch :datums="parsedDatums" />
                </AbsEnclosure>
                <div v-if="isRateOutdated" class="fullSize yBottom xRight">
                    <div style="display: grid; grid-template-columns: auto auto; color: orange;">
                        <div class="center" style="font-size: 12px; margin-bottom: 4px;">Stale Data</div>
                        <div class="center">
                            <GaIcon icon="warning" style="transform:scale(0.7);"/>
                        </div>
                    </div>
                </div>
            </OverlapArea>
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
import GaIcon from '@/modules/core/components/gaIcon.vue';
import OverlapArea from '@/modules/core/components/overlapArea.vue';
import AbsEnclosure from '@/modules/core/components/absEnclosure.vue';

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

const isRateOutdated = computed(() =>
{
    if (!datumResponse.lastSuccessfulData?.value?.datums?.length) return false;
    const datums = datumResponse.lastSuccessfulData.value.datums.sort((a,b) => a.date - b.date);
    const latestDatum = datums[datums.length - 1];
    return latestDatum.date <= Date.now() - 86400000; // If is one day older
});
</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

.chartDisabled { pointer-events: none; opacity: 0.3; }
</style>