<template>
    <div class="wrappedLineChartRoot">
        <LineChart :plugins="[createVertLinePlugin(lineColor ?? defaultLineColor)]" ref="mainChartRef" :chartData="chartData" :options="chartOptions"/>
    </div>
</template>

<script lang="ts" setup>
import { LineChart } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import { computed, ref } from 'vue';
import { extractDatePart, extractTimePart } from '../utils/date';
import { createVertLinePlugin } from '../utils/chartJsVertLinePlugin';

const defaultLineColor = `rgb(75, 192, 192)`;

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
            type: 'derivedBubble',
            responsive: true,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display:false } },
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
            },
            options: 
            {
                interaction: 
                {
                    mode: 'index',
                    intersect: false,
                },
            }
        } as ChartOptions<'line'>
    )
});

const mainChartRef = ref();
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
                borderColor: props.lineColor ?? defaultLineColor,
                tension: 0.1,
                pointRadius: 0,
                spanGaps: true,
            },
        ],
    };

    return data;
});
</script>

<style lang="css" scoped>
.wrappedLineChartRoot
{
    height: 100%;
    & > div { height: 100%; }
}
</style>