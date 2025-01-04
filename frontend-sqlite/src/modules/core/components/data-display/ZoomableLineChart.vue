<template>
    <div class="zoomableLineChartRoot">
        <div class="rel">
            <AbsEnclosure>
                <LineChart :plugins="[createVertLinePlugin(lineColor ?? defaultLineColor)]"
                           ref="mainChartRef" class="fullHeight"
                           :chartData="getChartDataTop()"
                           :options="getChartOptionsTop()"/>
            </AbsEnclosure>
        </div>
        <div :style="{paddingLeft: `${mainChartAreaLeft}px`, 'transition': 'all 2s ease', 'transition-delay': '0.5s'}">
            <div class="rel fullHeight">
                <OverlapArea>
                    <AbsEnclosure class="fullSize">
                        <LineChart ref="secChartRef" class="fullHeight"
                                   :chartData="getChartDataBottom()"
                                   :options="getChartOptionsBottom()"
                                   :style="{
                                        clipPath: `polygon(
                                            ${rangeStart.get()}% 0%,
                                            ${rangeEnd.get()}% 0%,
                                            ${rangeEnd.get()}% 100%,
                                            ${rangeStart.get()}% 100%)`
                                        }"/>
                    </AbsEnclosure>
                    <AbsEnclosure class="fullSize">
                        <LineChart ref="secChartRef" class="fullHeight"
                                   :chartData="getChartDataBottom()" style="opacity: 0.3"
                                   :options="getChartOptionsBottom()"/>
                    </AbsEnclosure>
                    <AbsEnclosure>
                        <div class="fullSize">
                            <VRangeSlider trackSize="50%" :hideDetails="true" @start="e => emit('sliderStart', e)"
                                          density="compact" :thumbSize="6" @end="e => emit('sliderEnd', e)"
                                          @update:model-value="e => { rangeStart.set(e[0]); rangeEnd.set(e[1]); updateMainChartAreaLeft(); }"
                                          :model-value="[rangeStart.get(), rangeEnd.get()]"
                                          :tickSize="0" rounded="0" :ripple="false" strict />
                        </div>
                    </AbsEnclosure>
                </OverlapArea>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { VRangeSlider } from 'vuetify/components';
import { LineChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import { computed, ref, watch } from 'vue';
import { extractDatePart, extractTimePart } from '@/modules/core/utils/date';
import { createVertLinePlugin } from '@/modules/core/utils/chartJsVertLinePlugin';
import AbsEnclosure from '../layout/AbsEnclosure.vue';
import OverlapArea from '../layout/OverlapArea.vue';
import { defineProperty, Uncontrolled } from '../../utils/defineProperty';
Chart.register(...registerables);
const defaultLineColor = `rgb(75, 192, 192)`;

export type ZoomableLineChartPropsType =
{
    lineColor?: string | undefined,
    zoomedDatums: { x:number, y:number }[],
    wholeDatums: { x:number, y:number }[],
    isXAxisEpoch?: boolean,
    hideXAxisTimePart?: boolean,
    showAxisLabels?: boolean,
    showGridLines?: boolean,
    rangeStart?: number | typeof Uncontrolled,
    rangeEnd?: number | typeof Uncontrolled
};
export type ZoomableLineChartEmitsType =
{
    (e: 'update:rangeStart', v: number): void,
    (e: 'update:rangeEnd', v: number): void,
    (e: 'sliderEnd', v: [number, number]): void,
    (e: 'sliderStart', v: [number, number]): void
};

const props = withDefaults(defineProps<ZoomableLineChartPropsType>(),
{
    showAxisLabels: true,
    showGridLines: true,
    rangeStart: Uncontrolled,
    rangeEnd: Uncontrolled
});
const emit = defineEmits<ZoomableLineChartEmitsType>();

const rangeStart = defineProperty<number, "rangeStart", typeof props>(
    "rangeStart",
    { emitFunc: emit, props: props, default: 0 }
);
const rangeEnd = defineProperty<number, "rangeEnd", typeof props>(
    "rangeEnd",
    { emitFunc: emit, props: props, default: 0 }
);

const formatEpoch = (epoch: number) =>
{
    const date = new Date(epoch);
    return [ extractDatePart(date), props.hideXAxisTimePart ? undefined : extractTimePart(date) ]
           .filter(x => x !== undefined);
};

const getChartOptionsBottom = () =>
{
    return (
        {
            type: 'derivedBubble',
            responsive: true,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display:false } },
            scales:
            {
                x:
                {
                    position: 'top',
                    border: { display: true, color: '#333' },
                    ticks: { maxTicksLimit: 5, display: false },
                    grid:
                    {
                        display: props.showGridLines,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: '#222'
                    },
                },
                y:
                {
                    min: chartMinValueBottom.value,
                    beginAtZero: false,
                    border: { display: true, color: '#333', },
                    grid: { display: props.showGridLines, drawOnChartArea: true, drawTicks: true, color: '#222' },
                    ticks: { display: false },
                }
            },
            options:
            {
                interaction:
                {
                    mode: 'index',
                    intersect: false,
                }
            }
        } as ChartOptions<'line'>
    )
};

const getChartOptionsTop = () =>
{
    return (
        {
            type: 'derivedBubble',
            responsive: true,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display:false } },
            scales:
            {
                x:
                {
                    position: 'top',
                    border: { display: true, color: '#333' },
                    ticks:
                    {
                        autoSkip: true, maxTicksLimit: 5,
                        maxRotation: 0, minRotation: 0,
                        display: props.showAxisLabels,
                    },
                    grid:
                    {
                        display: props.showGridLines,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: '#222'
                    },
                },
                y:
                {
                    beginAtZero: false,
                    border: { display: true, color: '#333', },
                    grid: { display: props.showGridLines, drawOnChartArea: true, drawTicks: true, color: '#222' },
                    ticks: { display: props.showAxisLabels },
                }
            },
            options:
            {
                interaction:
                {
                    mode: 'index',
                    intersect: false,
                }
            }
        } as ChartOptions<'line'>
    )
};

const processedDatasetTop = computed<{ label: number | string[], x: number, y: number, }[]
>(() =>
{
    return props.zoomedDatums.map(d =>
    {
        const label = props.isXAxisEpoch ? formatEpoch(d.x) : d.x;
        return { label: label, x: d.x, y: d.y }
    })
});
const processedDatasetBottom = computed<{ label: number | string[], x: number, y: number, }[]
>(() =>
{
    return props.wholeDatums.map(d =>
    {
        const label = props.isXAxisEpoch ? formatEpoch(d.x) : d.x;
        return { label: label, x: d.x, y: d.y }
    })
});
const chartMinValueBottom = computed(() => Math.min(...props.wholeDatums.map(x => x.y)));
const mainChartRef = ref<ExtractComponentData<typeof LineChart>>();
const mainChartAreaLeft = ref(0);
function updateMainChartAreaLeft()
{
    if (!mainChartRef.value) return undefined;
    const instance = ((mainChartRef.value as any).chartInstance as Chart<'line'>);
    mainChartAreaLeft.value = instance.getDatasetMeta(0).xScale!.left - 8;
}
watch(() => props.zoomedDatums, () => setTimeout(() => updateMainChartAreaLeft(), 100))

const getChartDataTop = () =>
{
    const colorComponent = { borderColor: props.lineColor ?? defaultLineColor };

    const data: ChartData<'line'> =
    {
        labels: processedDatasetTop.value.map(x => [...(typeof x.label === 'number' ? [x.label] : x.label), " "]),
        datasets:
        [
            {
                data: processedDatasetTop.value.map(x => x.y),
                tension: 0.1,
                pointRadius: 0,
                spanGaps: true,
                ...colorComponent
            },
        ],
    };

    return data;
};
const getChartDataBottom = () =>
{
    const colorComponent =
    {
        fill: true,
        backgroundColor: '#333',
        borderColor: '#333'
    };

    const data: ChartData<'line'> =
    {
        labels: processedDatasetBottom.value.map(x => x.label),
        datasets:
        [
            {
                data: processedDatasetBottom.value.map(x => x.y),
                tension: 0.1,
                pointRadius: 0,
                spanGaps: true,
                ...colorComponent
            }
        ],
    };

    return data;
};

</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

* { box-sizing: border-box }

.zoomableLineChartRoot
{
    height: 100%;
    & > div { height: 100%; }
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 50px;

    :deep(.v-input--horizontal) { margin-inline: 0px 0px; }
    :deep(.v-slider-thumb)
    {
        height: 50px;
    }
    :deep(.v-slider-thumb__surface)
    {
        width: 1px;
        border-radius: 0px;
        height: calc(100% - 1px);
        border-color: cyan;
        border-width: 0;
        border-style: dotted;
        background: transparent;
    }
    :deep(.v-slider-thumb):nth-of-type(2) > div { clip-path: inset(0 50% 0 0); border-left-width: 3px; }
    :deep(.v-slider-thumb):nth-of-type(3) > div { clip-path: inset(0 0% 0 49%); border-right-width: 3px; }

    *:deep(.v-slider-track__fill) { opacity: 0; }
    *:deep(.v-slider-track__background) { opacity: 0; }
}
</style>