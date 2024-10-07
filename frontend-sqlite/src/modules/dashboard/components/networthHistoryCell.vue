<template>
    <cell :title="'Networth History'">
        <template v-if="datumResponse.isLoading.value || datumResponse.error.value">
            <NetworkCircularIndicator :error="datumResponse.error.value" :is-loading="datumResponse.isLoading.value" class="fullSize center"/>
        </template>
        <template v-else-if="parsedDatums?.length == 0">
            <div class="fullSize center">
                <div>No Data Available</div>
            </div>
        </template>
        <template v-else>
            <WrappedLineChart :is-x-axis-epoch="true"
                              hideXAxisTimePart
                              :datums="parsedDatums"></WrappedLineChart>
        </template>
        <template #cellOptions>
            <variants-selector :availableOptions="['All', '30d', '7d']" v-model:selectedOption="selectedOption"></variants-selector>
        </template>
    </cell>
</template>

<script lang="ts" setup>
import WrappedLineChart from '@/modules/core/components/wrappedLineChart.vue';
import cell from '@/modules/core/components/cell.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import { computed, ref, watch } from 'vue';
import NetworkCircularIndicator from '@/modules/core/components/networkCircularIndicator.vue';
import type { GetUserNetworthHistoryAPI } from '../../../../../api-types/calculations';
import variantsSelector from '@/modules/core/components/variantsSelector.vue';
import { API_NET_WORTH_GRAPH_PATH } from '@/apiPaths';

type AvailableOptions = "All" | "30d" | "7d";

const selectedOption = ref<AvailableOptions>('30d');
const datumResponse = useNetworkRequest<GetUserNetworthHistoryAPI.ResponseDTO>
(
    `${API_NET_WORTH_GRAPH_PATH}`,
    {
        autoResetOnUnauthorized: true,
        includeAuthHeaders: true,
        updateOnMount: false
    }
);

watch(selectedOption, (newVal, oldVal) =>
{
    if (newVal === 'All')
    {
        datumResponse.setQueryObj(
        {
            url: `${API_NET_WORTH_GRAPH_PATH}`,
            query: { }
        });
        return datumResponse.updateData();
    }

    const queryStartEpoch = Date.now() - (newVal === '30d' ? 2_592_000_000 : 604_800_000);
    datumResponse.setQueryObj(
    {
        url: `${API_NET_WORTH_GRAPH_PATH}`,
        query: { startDate: `${queryStartEpoch}` }
    });
    return datumResponse.updateData();

}, { immediate: true });

const parsedDatums = computed(() =>
{
    const apiResponse = datumResponse.lastSuccessfulData;
    const datums = Object.entries(apiResponse.value?.map ?? {}) ?? [];
    return datums.map(d => (
    {
        x: parseInt(d[0]),
        y: parseFloat(d[1])
    }));
});

</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";
</style>