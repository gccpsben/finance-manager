<template>
    <grid-shortcut id="graphPanel" style="padding:15px; gap:15px;" columns="1fr" rows="auto minmax(0,1fr)">
        <grid-shortcut rows="1fr" columns="1fr auto">
            <h2 class="graphPanelTitle">{{ title }}</h2>
            <div class="variantSelector">

                <h2 :class="{'selected': selectedVarient=='All'}" @click="selectedVarient = 'All'" 
                class="graphPanelTitle variantTab">All</h2>

                <h2 :class="{'selected': selectedVarient=='7d'}" @click="selectedVarient = '7d'" 
                class="graphPanelTitle variantTab">7d</h2>

                <h2 :class="{'selected': selectedVarient=='30d'}" @click="selectedVarient = '30d'" 
                class="graphPanelTitle variantTab">30d</h2>

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
import { defineComponent } from 'vue';
import { LineChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import { useMainStore } from '@/stores/store';
Chart.register(...registerables);

export default defineComponent(
{
    name: 'Home',
    components: { LineChart },
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
            selectedVarient: "All" as "All" | "30d" | "7d"
        };
        return data;
    },
    computed:
    {
        chartData()
        {
            let selectedVarient = this.selectedVarient;
            let sourceData = [...this.store.valueHistory] ?? [];
            sourceData.forEach(item => { item.date = new Date(item.date) })

            let terminalDate = new Date();

            if (selectedVarient != "All")
            {
                if (selectedVarient == "30d") terminalDate.setDate(terminalDate.getDate() - 30);
                else if (selectedVarient == "7d") terminalDate.setDate(terminalDate.getDate() - 7);
                sourceData = sourceData.filter(item => item.date > terminalDate);
            }

            let xAxisLabels: Array<string> = sourceData.map(item => item.date.toLocaleDateString());
            let yAxisData = sourceData.map(item => item.value);

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