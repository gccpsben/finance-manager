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

                    <NetworkCircularIndicator style="color:unset;" v-show="store.balanceValueHistory.isLoading || store.balanceValueHistory.error" 
                    :isLoading="store.balanceValueHistory.isLoading"
                    :error="store.balanceValueHistory.error"/>

                    <LineChart v-if="balanceValueHistoryGraphData" v-show="!store.balanceValueHistory.isLoading && !store.balanceValueHistory.error" 
                    :chartData="balanceValueHistoryGraphData" :options="balanceValueHistoryGraphOptions" style="max-height:100%;"></LineChart>

                    <VRangeSlider v-show="!store.balanceValueHistory.isLoading && !store.balanceValueHistory.error"
                    color="#666666" density="compact" thumb-size="12" hide-details v-model="balanceValueHistoryRange"
                    :min="balanceValueHistoryStartDate?.getTime() ?? 0"
                    :max="balanceValueHistoryEndDate?.getTime() ?? 1" />

                    <div v-show="!store.balanceValueHistory.isLoading && !store.balanceValueHistory.error"
                     class="fullWidth" style="display:grid; grid-template-columns: auto 1fr auto 1fr auto; grid-template-rows: 1fr;">
                        <h2 class="rangeSelectorDetail">
                            {{ balanceValueHistoryStartDate ? formatDate(balanceValueHistoryStartDate) : '' }}
                        </h2>
                        <div class="xRight">
                            <h2 class="rangeSelectorDetail">{{ formatDate(new Date(balanceValueHistoryRange[0])) }}</h2>
                        </div>
                        <div class="center" style="margin-left:16px; margin-right:16px;">
                            <h2 class="rangeSelectorDetail"> - </h2>
                        </div>
                        <div class="xLeft">
                            <h2 class="rangeSelectorDetail">{{ formatDate(new Date(balanceValueHistoryRange[1])) }}</h2>
                        </div>
                        <div class="xRight">
                            <h2 class="rangeSelectorDetail">{{ balanceValueHistoryEndDate ? formatDate(balanceValueHistoryEndDate) : '' }}</h2>
                        </div>
                    </div>
                </cell>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
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
        grid-template-rows: minmax(0,400px) minmax(0,400px) minmax(0,700px);
        grid-template-areas: "TotalValueGraph ExpensesIncomesGraph" "AssetsCompositionByCurrencyGraph AssetsCompositionByContainerGraph" "BalanceHistoryGraph BalanceHistoryGraph";
    }
}

.rangeSelectorDetail { text-align:start; color:gray; font-size:14px; .tight; display:inline; }

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
import { useMainStore } from "@/modules/core/stores/store";
import { BarChart, LineChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import { VRangeSlider } from "vuetify/lib/components/index.mjs";
import NetworkCircularIndicator from "@/modules/core/components/networkCircularIndicator.vue";
Chart.register(...registerables);

export default

{
    components: { BarChart, LineChart, VRangeSlider, NetworkCircularIndicator },
    async mounted()
    {
        await this.store.graphsSummary.updateData();
        await this.store.updateDashboardBatch();
        await this.store.balanceValueHistory.updateData();

        if (!this.balanceValueHistoryStartDate || !this.balanceValueHistoryEndDate) return;
        this.balanceValueHistoryRange = [this.balanceValueHistoryStartDate.getTime(), this.balanceValueHistoryEndDate.getTime()];
    },
    data()
    {
        let store = useMainStore();

        let data =
        {
            store: store,
            columns:
            [
                {
                    label: "Title",
                    field: "title",
                    width:"1fr"
                }
            ],
            balanceValueHistoryRange: [0, 1]
        };
        return data;
    },
    computed:
    {
        expensesIncomesData()
        {
            const data: ChartData<'bar'> =
            {
                labels: this.store.graphsSummary.lastSuccessfulData?.expensesIncomesByDate?.labels ?? [],
                datasets:
                [
                    {
                        // Incomes
                        data: this.store.graphsSummary?.lastSuccessfulData?.expensesIncomesByDate?.incomes ?? [],
                        backgroundColor: 'green'
                    },
                    {
                        // Expenses
                        data: this.store.graphsSummary.lastSuccessfulData?.expensesIncomesByDate?.expenses ?? [],
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
            for (let container of this.store.containers.lastSuccessfulData?.rangeItems ?? [])
            {
                let c = container;
                for (let currencyPubID in c.balance)
                {
                    let currency = (this.store.currencies.lastSuccessfulData ?? []).find(c => c.id == currencyPubID);
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
            for (let container of this.store.containers.lastSuccessfulData ?? [])
            {
                let c = container;
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
            if (!this.store.balanceValueHistory.lastSuccessfulData) return;
            if (this.store.balanceValueHistory.isLoading || this.store.balanceValueHistory.error) return;
            if (!this.balanceValueHistoryRange) return;

            let timestamps = this.store.balanceValueHistory.lastSuccessfulData.timestamps ?? [];
            let timestampsAsDates = timestamps.map(x => new Date(parseInt(x)));

            let balances = this.store.balanceValueHistory.lastSuccessfulData.balance ?? {};

            let viewingRange = [new Date(this.balanceValueHistoryRange[0]), new Date(this.balanceValueHistoryRange[1])];
            let rangeStartTimestampsItem = timestampsAsDates.find(d => d.getTime() >= viewingRange[0].getTime());
            let rangeEndTimestampsItem = timestampsAsDates.find(d => d.getTime() >= viewingRange[1].getTime());
            let rangeStartTimestampsIndex = rangeStartTimestampsItem === undefined ? 0 : timestampsAsDates.indexOf(rangeStartTimestampsItem);
            let rangeEndTimestampsIndex = rangeEndTimestampsItem === undefined ? 0 : timestampsAsDates.indexOf(rangeEndTimestampsItem);
            let cropArrayToView = (array: any[]) => array.slice(rangeStartTimestampsIndex, rangeEndTimestampsIndex);

            let labels = cropArrayToView(timestampsAsDates.map(x => x.toLocaleDateString()));
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
                        data: cropArrayToView(dataset[1]),
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
        },
        balanceValueHistoryStartDate()
        {
            if (!this.store?.balanceValueHistory?.lastSuccessfulData?.timestamps) return undefined;
            return new Date(parseInt(this.store.balanceValueHistory.lastSuccessfulData.timestamps[0]));
        },
        balanceValueHistoryEndDate()
        {
            if (!this.store?.balanceValueHistory?.lastSuccessfulData?.timestamps) return undefined;
            return new Date(parseInt(this.store.balanceValueHistory.lastSuccessfulData.timestamps[this.store.balanceValueHistory.lastSuccessfulData.timestamps.length - 1]));
        }
    },
    methods:
    {
        formatDate(date:Date)
        {
            return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDay() + 1}`;
        }
    }
}
</script>

