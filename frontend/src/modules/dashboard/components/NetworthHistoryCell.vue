<template>
    <cell v-if="targetRequestComposable">
        <template #title>Networth History</template>
        <template v-if="targetRequestComposable.isLoading || targetRequestComposable.error">
            <NetworkCircularIndicator :error="targetRequestComposable.error" :is-loading="!!targetRequestComposable.isLoading" class="fullSize center"/>
        </template>
        <template v-else-if="parsedDatums?.length == 0">
            <div class="fullSize center noDataAvailableNotice">
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
import WrappedLineChart from '@/modules/core/components/data-display/WrappedLineChart.vue';
import cell from '@/modules/core/components/data-display/Cell.vue';
import { computed, ref, watch } from 'vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import variantsSelector from '@/modules/core/components/inputs/VariantsSelector.vue';
import { useNetworthHistoryStore } from '@/modules/charts/stores/networthHistoryStore';

type AvailableOptions = "All" | "30d" | "7d";

const networthHistoryStore = useNetworthHistoryStore();
const selectedOption = ref<AvailableOptions>('30d');
const targetRequestComposable = computed(() =>
{
    if (selectedOption.value === '30d') return networthHistoryStore._30d;
    else if (selectedOption.value === '7d') return networthHistoryStore._7d;
    return networthHistoryStore._all;
});

watch([targetRequestComposable, selectedOption], (newVal, oldVal) =>
{
    if (!targetRequestComposable.value.isLoading)
        targetRequestComposable.value.updateData();
}, { immediate: true });

const parsedDatums = computed(() =>
{
    if (!targetRequestComposable.value?.lastSuccessfulData) return [];
    const apiResponse = targetRequestComposable.value.lastSuccessfulData;
    const datums = Object.entries(apiResponse?.map ?? {}) ?? [];
    return datums.map(d => (
    {
        x: parseInt(d[0]),
        y: parseFloat(d[1])
    }));
});

</script>

<style lang="less" scoped>
@import "@/modules/core/stylesheets/globalStyle.less";

.noDataAvailableNotice { color: @foreground; }
</style>