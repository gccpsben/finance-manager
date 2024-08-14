<template>
    <LineChart :plugins="[vertLinePlugin]" ref="mainChartRef" :chartData="chartData" :options="chartOptions"/>
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
import { LineChart } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData, type Plugin } from "chart.js";
import { computed, ref } from 'vue';
import { extractDatePart, extractTimePart } from '../utils/date';

const defaultLineColor = `rgb(75, 192, 192)`;

Chart.register(...registerables);

const props = defineProps<
{
    lineColor?: string | undefined,
    datums: { x:number, y:number }[],
    isXAxisEpoch?: boolean
}>();

let lastMouseLocation = { x:0, y:0 };
let lastNearestDatumIndex = undefined as undefined | number;
let lastNearestDatasetIndex = undefined as undefined | number;

const vertLinePlugin: Plugin<'line', {}> = 
(
    {
        id: 'vertLine',
        beforeDraw: function(chart, args, options)
        {
            const context = chart.canvas.getContext('2d')!;
            const chartBounds = chart.canvas.getBoundingClientRect();

            // Check if mouse is within bound, return if not
            const isMouseWithinChartArea = (() => 
            {
                const relativeX = lastMouseLocation.x - chartBounds.x - chart.chartArea.left;
                const relativeY = lastMouseLocation.y - chartBounds.y - chart.chartArea.top;
                const isWithinLeftBorder = relativeX >= 0;
                const isWithinRightBorder = relativeX <= chart.chartArea.width;
                const isWithinTopBorder = relativeY >= 0;
                const isWithinBottomBorder = relativeY <= chart.chartArea.height;
                return isWithinLeftBorder && isWithinRightBorder && isWithinTopBorder && isWithinBottomBorder;
            })();

            if (!isMouseWithinChartArea) return;

            let beforeStrokeStyle = context.strokeStyle;
            context.strokeStyle = props.lineColor ?? defaultLineColor;
            context.beginPath();
            context.moveTo(lastMouseLocation.x - chartBounds.x, chart.chartArea.top);
            context.lineTo(lastMouseLocation.x - chartBounds.x, chart.chartArea.height + chart.chartArea.top);

            if (lastNearestDatumIndex !== undefined && lastNearestDatasetIndex !== undefined)
            {
                const activeElements = [ { datasetIndex: lastNearestDatasetIndex, index: lastNearestDatumIndex } ];
                if (chart.tooltip) chart.tooltip.setActiveElements(activeElements, { x: lastMouseLocation.x, y: lastMouseLocation.y });
                chart.setActiveElements(activeElements);
            }
            else
            {
                if (chart.tooltip) chart.tooltip.setActiveElements([], { x: lastMouseLocation.x, y: lastMouseLocation.y });
                chart.setActiveElements([]);
            }

            context.stroke();
            context.closePath();
            context.strokeStyle = beforeStrokeStyle;
        },
        afterInit: function(chart, args, options) 
        {           
            chart.canvas.onmouseleave = (e:MouseEvent) => 
            {
                lastMouseLocation.x = -1;
                lastMouseLocation.y = -1;
            };
            chart.canvas.onmousemove = (e: MouseEvent) => 
            {
                const nearestMouseItems = chart.getElementsAtEventForMode
                (
                    e, 
                    'index', 
                    { intersect: false }, 
                    true
                );

                lastMouseLocation.x = e.clientX;
                lastMouseLocation.y = e.clientY;
                lastNearestDatumIndex = nearestMouseItems[0]?.index;
                lastNearestDatasetIndex = nearestMouseItems[0]?.datasetIndex;
                chart.update();
            };
        }
    }
);

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