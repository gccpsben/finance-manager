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
                    <VTooltip class="staleDataTooltip" :location="'bottom start'"
                              open-on-click :close-delay="500" :open-delay="500">
                        <template v-slot:activator="{ props }">
                            <div class="staleDataWarning" v-bind="props">
                                <div class="center" style="font-size: 12px; margin-bottom: 4px;">Stale Data</div>
                                <div class="center">
                                    <GaIcon icon="warning" style="transform:scale(0.7);"/>
                                </div>
                            </div>
                        </template>
                        <div>Last data-point fetched is at least 1 day old.</div>
                    </VTooltip>
                </div>
            </OverlapArea>
        </template>
    </div>
</template>

<script lang="ts" setup>
import WrappedLineChart from '@/modules/core/components/data-display/WrappedLineChart.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetCurrencyRateHistoryAPI } from '@/../../api-types/currencies';
import { API_CURRENCY_RATE_HISTORY_PATH } from '@/apiPaths';
import { computed, watch } from 'vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import GaIcon from '@/modules/core/components/decorations/GaIcon.vue';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';
import AbsEnclosure from '@/modules/core/components/layout/AbsEnclosure.vue';
import { VTooltip } from 'vuetify/components';

const SEVEN_DAYS_AGO = Date.now() - 86400000 * 7;

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
    let datums = apiResponse.value?.datums ?? [];
    datums.sort((a,b) => a.date - b.date);
    if (datums.length < 2) return [];
    datums = datums.filter(x => x.date >= SEVEN_DAYS_AGO);

    return datums.map(d => (
    {
        x: d.date,
        y: parseFloat(d.value)
    }));
});

const isRateOutdated = computed(() =>
{
    if (!datumResponse.lastSuccessfulData?.value?.datums?.length) return false;
    return datumResponse.lastSuccessfulData.value.endDate! <= Date.now() - 86400000;
});
</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

.chartDisabled { pointer-events: none; opacity: 0.3; }
.staleDataTooltip
{
    & > *
    {
        background: @backgroundDark !important;
        border: 1px solid @border !important;
        box-shadow: 0px 0px 5px #000;
        color: white;
        pointer-events: all;
    }
}
.staleDataWarning
{
    display: grid;
    grid-template-columns: auto auto;
    color: tan;
    &:hover { color: orange; }
}
</style>