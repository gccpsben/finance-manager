<template>
    <div id="topDiv">
        <div id="mainGrid">
            <grid-area area="TotalValueGraph">
                <total-value-graph-cell title="Total Value"></total-value-graph-cell>
            </grid-area>
            <grid-area area="ExpensesIncomesGraph">
                <cell title="Expenses and Incomes">
                    <BarChart :chart-data="expensesIncomesData" :options="expensesIncomesOptions" style="max-height:100%;"></BarChart>
                </cell>
            </grid-area>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    padding:50px;
    box-sizing: border-box;
    overflow-x:hidden; .fullSize;
    font-family: 'Schibsted Grotesk', sans-serif;

    #mainGrid
    {
        .fullSize; display:grid; gap:15px;
        grid-template-columns: minmax(0,1fr) minmax(0,1fr);
        grid-template-rows: minmax(0,500px) minmax(0,500px);
        grid-template-areas: "TotalValueGraph ExpensesIncomesGraph" "_4 _5";
    }
}
</style>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import { BarChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import type { transactions } from "@prisma/client";
Chart.register(...registerables);

export default 

{
    components: { BarChart },
    async mounted()
    {
        await this.store.updateGraphsSummary();
    },
    data()
    {
        var data = 
        {
            store: useMainStore(),
            columns:
            [
                {
                    label: "Title",
                    field: "title",
                    width:"1fr",
                }
            ]
        };
        return data;
    },
    computed:
    {
        expensesIncomesData()
        {
            const data: ChartData<'bar'> = 
            {
                labels: this.store.graphsSummary?.expensesIncomesByDate?.labels ?? [],
                datasets: 
                [
                    {
                        // Incomes
                        data: this.store.graphsSummary?.expensesIncomesByDate?.incomes ?? [],
                        backgroundColor: 'green'
                    },
                    {
                        // Expenses
                        data: this.store.graphsSummary?.expensesIncomesByDate?.expenses ?? [],
                        backgroundColor: 'red'
                    },
                ],
            };
            return data;
        },
        expensesIncomesOptions()
        {
            var options: ChartOptions<'bar'> = 
            {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales:
                {
                    x: { stacked: true, ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0, minRotation: 0 } },
                    y: { stacked: true },
                    // xAxes: { ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0, minRotation: 0 } },
                    // yAxes: { beginAtZero: false },
                }
            };
            return options;
        }
    }
}
</script>

