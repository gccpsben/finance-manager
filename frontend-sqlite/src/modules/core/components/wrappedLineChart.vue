<template>
    <LineChart :chartData="chartData" :options="chartOptions" />
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
#graphPanel
{
    overflow:hidden;
    .fullSize; .bg(@backgroundDark);
    box-sizing:border-box;

    .graphPanelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
    .variantSelector
    {
        & > h2:nth-child(2) { margin-left:5px; }
        & > h2:nth-child(3) { margin-left:5px; }
        & > h2:nth-child(4) { margin-left:5px; }
        
        .variantTab { cursor: pointer; }
        .variantTab.selected { color:@focus;}
    }
    & /deep/ .variantSelectorTab
    {
        color:white; text-align:start; color:gray; font-size:26px;
        .tight;
    }
}
</style>

<script lang="ts" setup>
import { LineChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import { computed } from 'vue';
import { extractDatePart, extractTimePart } from '../utils/date';

Chart.register(...registerables);

const props = defineProps<
{
    lineColor?: string | undefined,
    datums: { x:number, y:number }[],
    isXAxisEpoch?: boolean
}>();

const chartOptions = computed(() => 
{
    return (
        {
            type: 'line',
            responsive: true,
            animation: false,
            maintainAspectRatio: false,
            plugins: 
            {
                legend: { display: false }
            },
            scales:
            {
                x:
                {
                    border: { display: true, color: '#333' },
                    ticks: { autoSkip: true, maxTicksLimit: 5, maxRotation: 0, minRotation: 0 },
                    grid: { display: true, drawOnChartArea: true, drawTicks: true, color: '#222' },
                },
                y: 
                { 
                    beginAtZero: false,
                    border: { display: true, color: '#333', },
                    grid: { display: true, drawOnChartArea: true, drawTicks: true, color: '#222' },
                }
            }
        } as ChartOptions<'line'>
    )
});

const chartData = computed(() => 
{
    const formatEpoch = (epoch: number) => 
    {
        const date = new Date(epoch);
        return [extractDatePart(date), extractTimePart(date)];
    };

    let xAxisLabels: number[] | string[][] = (() => // nested array (string[][]) for multi-line labels
    {
        if (props.isXAxisEpoch) return props.datums.map(k => formatEpoch(k.x))
        else return props.datums.map(k => k.x);
    })();
    let yAxisData: number[] = props.datums.map(k => k.y);

    const data: ChartData<'line'> = 
    {
        labels: xAxisLabels,
        datasets: 
        [
            {
                data: yAxisData,
                fill: false,
                borderColor: props.lineColor ?? 'rgb(75, 192, 192)',
                tension: 0.1,
                pointRadius: 0,
                spanGaps: true,
            },
        ],
    };

    return data;
});
</script>