<template>
    <div id="topDiv">

        <view-title :title="'Charts'"></view-title>

        <div id="mainGrid">
            <grid-area area="TotalValueGraph">
                <net-worth-graph-cell title="Net Worth"></net-worth-graph-cell>
            </grid-area>
            <grid-area area="ExpensesIncomesGraph">
                <cell title="Expenses and Incomes">
                    <BarChart :chart-data="expensesIncomesData" :options="expensesIncomesOptions" style="max-height:100%;"></BarChart>
                </cell>
            </grid-area>
            <div v-area.class="'AssetsCompositionByCurrencyGraph'">
                <cell title="Composition by Currency">
                    <BarChart :chart-data="compositionCurrencyGraphData" :options="compositionCurrencyGraphOptions" style="max-height:100%;"></BarChart>
                </cell>
            </div>
            <div v-area.class="'AssetsCompositionByContainerGraph'">
                <cell title="Composition by Container (With pendings)">
                    <BarChart :chart-data="compositionContainerGraphData" :options="compositionContainerGraphOptions" style="max-height:100%;"></BarChart>
                </cell>
            </div>
            <div v-area.class="'BalanceHistoryGraph'">
                <cell title="Balance Value History">
                    <LineChart :chartData="balanceValueHistoryGraphData" :options="balanceValueHistoryGraphOptions" style="max-height:100%;"></LineChart>
                </cell>
            </div>
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
    .gradBackground;

    #mainGrid
    {
        height:auto; .fullWidth; display:grid; gap:15px;
        grid-template-columns: minmax(0,1fr) minmax(0,1fr);
        grid-template-rows: minmax(0,400px) minmax(0,400px) minmax(0,400px);
        grid-template-areas: "TotalValueGraph ExpensesIncomesGraph" "AssetsCompositionByCurrencyGraph AssetsCompositionByContainerGraph" "BalanceHistoryGraph BalanceHistoryGraph";
    }
}

@media only screen and (max-width: 600px) 
{
    #mainGrid
    {
        .fullSize; display:grid; gap:15px;
        grid-template-columns: minmax(0,1fr) !important;
        grid-template-rows: minmax(0,500px) minmax(0,500px) minmax(0,500px) minmax(0,500px) !important;
        grid-template-areas: 'TotalValueGraph' 'ExpensesIncomesGraph' 'AssetsCompositionByCurrencyGraph' 'AssetsCompositionByContainerGraph' "BalanceHistoryGraph" !important;
    }
}

</style>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import { BarChart, LineChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import type { containers, transactions } from "@prisma/client";
Chart.register(...registerables);

export default 

{
    components: { BarChart, LineChart },
    async mounted()
    {
        await this.store.updateCurrencies();
        await this.store.updateContainers();
        await this.store.updateGraphsSummary();
    },
    data()
    {
        let data = 
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
            let options: ChartOptions<'bar'> = 
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
        },
        compositionCurrencyGraphData()
        {
            let valuesByCurrency: {[key:string]: number} = {};
            for (let container of this.store.containers)
            {
                let c = container as any;
                for (let currencyPubID in c.balance)
                {
                    let currency = this.store.currencies.find(c => c.pubID == currencyPubID);
                    if (currency === undefined || currency.rate == undefined) continue;
                    let currencySymbol = currency.symbol;
                    let rate = Number.parseFloat(currency.rate.toString());
                    if (currencySymbol in valuesByCurrency) valuesByCurrency[currencySymbol] += c.balance[currencyPubID] * rate;
                    else valuesByCurrency[currencySymbol] = c.balance[currencyPubID] * rate;
                }
            }
            
            let entries = Object.entries(valuesByCurrency).sort((a,b) => b[1] - a[1]);
            let labels = entries.map(x => x[0]);
            let values = entries.map(x => x[1]);

            const data: ChartData<'bar'> = 
            {
                labels: labels,
                datasets: 
                [
                    {
                        data: values,
                        backgroundColor: 'green'
                    }
                ]
            };
            return data;
        },
        compositionCurrencyGraphOptions()
        {
            let options: ChartOptions<'bar'> = 
            {
                responsive: true,
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales:
                {
                    x: { stacked: true, ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0, minRotation: 0 } },
                    y: { stacked: true },
                },
            };
            return options;
        },
        compositionContainerGraphData()
        {
            let valuesByContainer: {[key:string]: number} = {};
            for (let container of this.store.containers)
            {
                let c = container as any;
                valuesByContainer[container.name] = c.value;
            }
            
            let entries = Object.entries(valuesByContainer).sort((a,b) => b[1] - a[1]);
            let labels = entries.map(x => x[0]);
            let values = entries.map(x => x[1]);

            const data: ChartData<'bar'> = 
            {
                labels: labels,
                datasets: 
                [
                    {
                        data: values,
                        backgroundColor: 'green'
                    }
                ]
            };
            return data;
        },
        compositionContainerGraphOptions()
        {
            let options: ChartOptions<'bar'> = 
            {
                responsive: true,
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales:
                {
                    x: { stacked: true, ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0, minRotation: 0 } },
                    y: { stacked: true },
                },
            };
            return options;
        },
        balanceValueHistoryGraphData()
        {
            let timestamps = this.store.balanceValueHistory?.timestamps ?? [];
            let balances = this.store.balanceValueHistory?.balance ?? {};

            let labels = timestamps.map(x => new Date(parseInt(x)).toLocaleDateString());
            let values: {[pubID:string]:number[]} = balances;
            let hue = 0;

            const data: ChartData<'line'> = 
            {
                labels: labels,
                datasets: Object.entries(values).map(dataset => 
                {
                    let color = `hsl(${hue},50%,50%)`;
                    hue += 40;
                    return {
                        data: dataset[1],
                        fill: false,
                        backgroundColor: color,
                        borderColor: color,
                        tension: 0.1,
                        borderWidth: 0.7,
                        pointRadius: 0,
                        spanGaps: true,
                        label: this.store.getCurrencySymbol(dataset[0]) };
                })
            };
            return data;
        },
        balanceValueHistoryGraphOptions()
        {
            let data: ChartOptions<'line'> = 
            {
                responsive: true,
                animation: false,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom'} },
                scales:
                {
                    xAxes:
                    {
                        ticks:
                        {
                            autoSkip: true,
                            maxTicksLimit: 5,
                            maxRotation: 0,
                            minRotation: 0
                        }
                    },
                    yAxes: { beginAtZero: false }
                }
            };
            return data;
        }
    }
}
</script>

