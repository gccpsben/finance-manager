<template>
    <cell :title="'Rates History'" :available-options="['All', '30d', '7d']"
          v-model:selected-option="selectedOption">
        <template v-if="datumResponse.isLoading.value || datumResponse.error.value">
            <NetworkCircularIndicator :error="datumResponse.error.value"
                                      :is-loading="datumResponse.isLoading.value"
                                      class="fullSize center"/>
        </template>
        <template v-else-if="parsedDatums?.length == 0">
            <div class="fullSize center">
                <div style="font-size: 12px;">No Data Available</div>
            </div>
        </template>
        <template v-else>
            <WrappedLineChart :is-x-axis-epoch="true" :datums="parsedDatums" />
        </template>
    </cell>
</template>

<script lang="ts" setup>
import WrappedLineChart from '@/modules/core/components/data-display/WrappedLineChart.vue';
import cell from '@/modules/core/components/data-display/Cell.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetCurrencyRateHistoryAPI } from '@/../../api-types/currencies';
import { API_CURRENCY_RATE_HISTORY_PATH } from '@/apiPaths';
import { computed, ref, watch } from 'vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';

type AvailableOptions = "All" | "30d" | "7d";

const selectedOption = ref<AvailableOptions>('All');
const props = defineProps<{ currencyId: string }>();
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

watch([() => props.currencyId, () => selectedOption.value], () =>
{
    if (selectedOption.value === 'All')
    {
        datumResponse.setQueryObj(baseQueryObj);
        return datumResponse.updateData();
    }

    const queryStartEpoch = Date.now() - (selectedOption.value === '30d' ? 2_592_000_000 : 604_800_000);
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