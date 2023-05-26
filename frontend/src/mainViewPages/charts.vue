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
            var allTransactions = [...this.store.allTransactions]; allTransactions.forEach(x => { x.date = new Date(x.date); });
            var topExpenses = 0;
            var latestDate = new Date(0);
            var oldestDate = new Date();

            // var keyingFunction = (x:Date) => x.toLocaleDateString(); // Advance per day
            // var advanceFunction = (x:Date) => new Date(x.setDate(x.getDate() + 1)); // Advance per day

            var keyingFunction = (x:Date) => `${x.getMonth()}-${x.getFullYear()}`; // Advance per month
            var advanceFunction = (x:Date) => new Date(x.setMonth(x.getMonth() + 1)); // Advance per month

            var expensesMap: {[key: string]: number} = {};
            var allExpenses = allTransactions.filter(x => x.from && !x.to);
            allExpenses.forEach(item => 
            { 
                var value = this.store.getValue(item.from!.amount.currencyID, item.from!.amount.value as number);
                var key = keyingFunction(item.date);

                if (item.date.getTime() >= latestDate.getTime()) latestDate = item.date;
                if (item.date.getTime() <= oldestDate.getTime()) oldestDate = item.date;
                if (value > topExpenses) topExpenses = value;

                expensesMap[key] = expensesMap[key] ? expensesMap[key] + value : value;
            });
            console.log(expensesMap);

            var incomesMap: {[key: string]: number} = {};
            var allIncomes = allTransactions.filter(x => !x.from && x.to);
            allIncomes.forEach(item => 
            { 
                var value = this.store.getValue(item.to!.amount.currencyID, item.to!.amount.value as number);
                var key = keyingFunction(item.date);

                if (item.date.getTime() >= latestDate.getTime()) latestDate = item.date;
                if (item.date.getTime() <= oldestDate.getTime()) oldestDate = item.date;

                incomesMap[key] = incomesMap[key] ? incomesMap[key] + value : value;
            });

            //               date,         income, expenses
            var totalMap: { [key: string]:[number, number] } = {};
            var loop = oldestDate;
            while(loop <= latestDate)
            {   
                // var newDate = new Date(loop.setDate(loop.getDate() + 1)); // Advance per day
                var newDate = advanceFunction(loop); // Advance per month

                var dateString = keyingFunction(newDate);
                loop = newDate;
                totalMap[dateString] = [incomesMap[dateString] ?? 0, expensesMap[dateString] ?? 0];
            }
            
            const data: ChartData<'bar'> = 
            {
                labels: Object.keys(totalMap),
                datasets: 
                [
                    {
                        // Incomes
                        data: Object.values(totalMap).map(x => x[0]),
                        backgroundColor: 'green'
                    },
                    {
                        // Expenses
                        data: Object.values(totalMap).map(x => x[1] * -1),
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

