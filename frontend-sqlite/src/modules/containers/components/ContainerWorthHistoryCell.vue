<template>
    <cell class="fullSize">
        <template #title>Container Value History</template>
        <OverlapArea class="fullSize">
            <div class="fullSize center">
                <NetworkCircularIndicator :error="anyRequestError" :is-loading="isAnyRequestLoading" />
            </div>
            <ZoomableLineChart :is-x-axis-epoch="true"
                               hideXAxisTimePart v-model:range-start="rangeStart" v-model:range-end="rangeEnd"
                               :zoomedDatums="containerNetworthHistoryZoomed" @slider-end="onSliderEnd"
                               :wholeDatums="containerNetworthHistory" />
        </OverlapArea>
    </cell>
</template>

<script setup lang="ts">
import Cell from '@/modules/core/components/data-display/Cell.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetContainerTimelineAPI } from '../../../../../api-types/container';
import { API_CONTAINERS_TIMELINES_PATH } from '@/apiPaths';
import { computed, ref } from 'vue';
import ZoomableLineChart from '@/modules/core/components/data-display/ZoomableLineChart.vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';

export type ContainerWorthHistoryCellPropsTypes = { containerId: string };
const props = defineProps<ContainerWorthHistoryCellPropsTypes>();

const rangeStart = ref(0);
const rangeEnd = ref(100);

const containerTimelinesWhole = useNetworkRequest<GetContainerTimelineAPI.ResponseDTO>
(
    {
        url: `${API_CONTAINERS_TIMELINES_PATH}` satisfies GetContainerTimelineAPI.Path<string>,
        query: { containerId: props.containerId }
    },
    { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: true, }
);
const containerTimelinesZoomed = useNetworkRequest<GetContainerTimelineAPI.ResponseDTO>
(
    {
        url: `${API_CONTAINERS_TIMELINES_PATH}` satisfies GetContainerTimelineAPI.Path<string>,
        query: { containerId: props.containerId }
    },
    { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: true, }
);

const wholeTimeRangeStart = computed(() => Math.min(...containerNetworthHistory.value.map(x => x.x)));
const wholeTimeRangeEnd = computed(() => Math.max(...containerNetworthHistory.value.map(x => x.x)));

const containerNetworthHistoryZoomed = computed(() =>
{
    if (containerTimelinesZoomed.isLoading.value || !containerTimelinesZoomed.lastSuccessfulData.value) return [];
    if (containerTimelinesZoomed.error.value) return [];
    return Object.entries(containerTimelinesZoomed.lastSuccessfulData.value.timeline).map(
        ([epoch, entry]) =>
            ({ x: parseInt(epoch), y: parseFloat(entry.containerWorth) })
    )
});

const containerNetworthHistory = computed(() =>
{
    if (containerTimelinesWhole.isLoading.value || !containerTimelinesWhole.lastSuccessfulData.value) return [];
    if (containerTimelinesWhole.error.value) return [];
    return Object.entries(containerTimelinesWhole.lastSuccessfulData.value.timeline).map(
        ([epoch, entry]) =>
            ({ x: parseInt(epoch), y: parseFloat(entry.containerWorth) })
    )
});

const isAnyRequestLoading = computed(() => containerTimelinesWhole.isLoading.value || containerTimelinesZoomed.isLoading.value);
const anyRequestError = computed(() => containerTimelinesWhole.error.value || containerTimelinesZoomed.error.value);

async function onSliderEnd()
{
    if (typeof wholeTimeRangeStart.value === 'string') return;
    if (typeof wholeTimeRangeEnd.value === 'string') return;

    const range = wholeTimeRangeEnd.value - wholeTimeRangeStart.value;

    containerTimelinesZoomed.setQueryObj(
    {
        url: `${API_CONTAINERS_TIMELINES_PATH}` satisfies GetContainerTimelineAPI.Path<string>,
        query:
        {
            containerId: props.containerId,
            startDate: `${Math.round(wholeTimeRangeStart.value + (range * rangeStart.value / 100))}`,
            endDate: `${Math.round(wholeTimeRangeStart.value + (range * rangeEnd.value / 100))}`,
        }
    });
}

function isObject(t: any): t is object {
    return typeof t === 'object';
}
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box }
</style>