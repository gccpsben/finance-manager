<template>
    <grid-shortcut id="graphPanel" style="padding:15px; gap:15px;" columns="1fr" rows="auto minmax(0,1fr)">
        <grid-shortcut rows="1fr" columns="1fr auto">
            <h2 class="graphPanelTitle">{{ title }}</h2>
            <div class="variantSelector">

                <h2 :class="{'selected': selectedVarient=='All'}" @click="selectedVarient = 'All'" 
                class="graphPanelTitle variantTab">All</h2>

                <h2 :class="{'selected': selectedVarient=='7d'}" @click="selectedVarient = '7d'" 
                class="graphPanelTitle variantTab">7d</h2>

                <h2 :class="{'selected': selectedVarient=='1m'}" @click="selectedVarient = '1m'" 
                class="graphPanelTitle variantTab">1m</h2>

                <h2 :class="{'selected': selectedVarient=='6m'}" @click="selectedVarient = '6m'" 
                class="graphPanelTitle variantTab">6m</h2>

            </div>
        </grid-shortcut>
        <LineChart :chartData="chartData" :options="chartOptions" />
    </grid-shortcut>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
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

<script lang="ts">
import { defineComponent, toRaw } from 'vue';
import { LineChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import { useMainStore } from '@/stores/store';
import NetworkCircularIndicator from '../networkCircularIndicator.vue';
Chart.register(...registerables);

export default defineComponent(
{
    name: 'Home',
    components: { LineChart, NetworkCircularIndicator },
    props: { "title": { default: "", type: String }, },
    setup()
    {
        let data = 
        {
            chartOptions: 
            {
                responsive: true,
                animation: false,
                maintainAspectRatio: false,
                plugins:
                {
                    legend: { display: false },
                },
                scales:
                {
                    xAxes:
                    {
                        ticks:
                        {
                            autoSkip: true,
                            maxTicksLimit: 3,
                            maxRotation: 0,
                            minRotation: 0
                        }
                    },
                    yAxes: { beginAtZero: false }
                }
            } as ChartOptions<'line'>,
        };
        return data;
    },
    data()
    {
        let data = 
        { 
            store: useMainStore(), 
            selectedVarient: "All" as "All" | "1m" | "7d" | "6m"
        };
        return data;
    },
    computed:
    {
        chartData()
        {
            let selectedVarient = this.selectedVarient;

            let sourceData = structuredClone(toRaw(this.store.netWorthHistory?.netWorthHistory ?? {}));

            let terminalDate = new Date();

            if (selectedVarient != "All")
            {
                if (selectedVarient == "1m") terminalDate.setDate(terminalDate.getDate() - 30);
                else if (selectedVarient == "7d") terminalDate.setDate(terminalDate.getDate() - 7);
                else if (selectedVarient == "6m") terminalDate.setDate(terminalDate.getDate() - 30 * 6);
                
                // remove all keys outside the viewing range
                sourceData = Object.fromEntries(Object.entries(sourceData).filter(([key, value]) => 
                {
                    return parseInt(key) >= terminalDate.getTime();
                }));
            }

            let xAxisLabels: string[] = Object.keys(sourceData).map(k => new Date(parseInt(k)).toLocaleDateString());
            let yAxisData: any = Object.values(sourceData);

            const data: ChartData<'line'> = 
            {
                labels: xAxisLabels,
                datasets: 
                [
                    {
                        data: yAxisData,
                        fill: false,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        pointRadius: 0,
                        spanGaps: true
                    },
                ],
            };
            return data;
        }
    }
});




// import { useMainStore } from '@/stores/store'
// import { DoughnutChart } from 'vue-chart-3';
// import { Chart, registerables } from "chart.js";
// Chart.register(...registerables);

// export default 
// {
//     components: { DoughnutChart },
//     props:
//     {
//         "title": { default: "", type: String },
//     },
//     data()
//     {
//         var testData = 
//         {
//             labels: ['Paris', 'Nîmes', 'Toulon', 'Perpignan', 'Autre'],
//             datasets: 
//             [
//                 {
//                     data: [30, 40, 60, 70, 5],
//                     backgroundColor: ['#77CEFF', '#0079AF', '#123E6B', '#97B0C4', '#A5C8ED'],
//                 },
//             ],
//         };
//         var store = useMainStore();
//         var data = 
//         {
//             store: store,
//             selectedVarient: '30d',
//             chartOptions: 
//             {
//                 responsive: true,
//                 maintainAspectRatio: false,
//             },
//             testData: testData
//         };
//         return data;
//     },
//     mounted()
//     {
        
//     },
//     computed:
//     {
//         chartData()
//         {
//             var xAxisLabels: Array<string> = this.store.valueHistory?.map(item => new Date(item.date).toLocaleDateString());
            

//             var output = 
//             {
//                 // labels: this.store.valueHistory?.reduce((acc,item) => { return [...acc, acc.length]; }, [] as Array<number>) ?? [],
//                 labels: xAxisLabels,
//                 datasets: 
//                 [ 
//                     {
//                         backgroundColor: '#f87979',
//                         label: "Total Value",
//                         data: this.store.valueHistory?.map(item => item.value) ?? []
//                     }
//                 ]
//             };
//             return output;
//         },
//         chartOptions()
//         {

//         }
//     }
// }
</script>