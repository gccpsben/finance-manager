<template>
    <div id="topDiv">

        <view-title :title="'Dashboard'"></view-title>

        <grid-shortcut id="mainGrid">

            <number-cell title="Expenses" :noItemsText="'No Expenses'" v-area="'expensesPanel'"
            :value7d="store.dashboardSummary.totalExpenses7d"
            :value30d="store.dashboardSummary.totalExpenses30d"
            :valueAll="store.dashboardSummary.totalExpenses"></number-cell>
        
            <number-cell title="Incomes" :noItemsText="'No Incomes'" v-area="'incomesPanel'"
            :value7d="store.dashboardSummary.totalIncomes7d"
            :value30d="store.dashboardSummary.totalIncomes30d"
            :valueAll="store.dashboardSummary.totalIncomes"></number-cell>
        
            <number-cell title="Total Value" v-area="'totalValuePanel'"
            :valueAll="store.dashboardSummary.totalValue"></number-cell>
            
            <number-cell title="Net Change" v-area="'netChangePanel'"
            :value7d="(store.dashboardSummary.totalIncomes7d - store.dashboardSummary.totalExpenses7d) ?? 0"
            :value30d="(store.dashboardSummary.totalIncomes30d - store.dashboardSummary.totalExpenses30d) ?? 0"></number-cell>

            <list-cell v-area="'_30dExpensesList'" title="30d Expenses" :noItemsText="'No Expenses'"
            :items="store.toReversed(store.dashboardSummary.expenses30d ?? [])">
                <template #row="props">
                    <grid-shortcut columns="50px 1fr 1fr" :class="
                    {
                        'fullSize': true,
                        'pendingTxn': props.currentItem.isTypePending && !props.currentItem.isResolved,
                        'resolvedTxn': props.currentItem.isTypePending && props.currentItem.isResolved,
                    }">
                        <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem["date"]) }}</div>
                        <div class="listItemTitle middleLeft">
                            {{ props.currentItem["title"] }}
                            <div v-if="props.currentItem.isTypePending && !props.currentItem.isResolved" class="pendingLabel">(Pending)</div>
                            <div v-if="props.currentItem.isTypePending && props.currentItem.isResolved" class="resolvedLabel">(Resolved)</div>
                        </div>
                        <div :title="getAmountTooltip(props.currentItem)" class="listItemTitle middleRight">
                            {{ store.formatAmount(props.currentItem, 'from') }}
                        </div>
                    </grid-shortcut>
                </template>
            </list-cell>

            <list-cell v-area="'_allPendingTransactionsList'" title="All Pending Txns" :noItemsText="'No Pending Txns'"
            :items="store.dashboardSummary?.allPendingTransactions ?? []">
                <template #row="props">
                    <grid-shortcut columns="50px 1fr 1fr" :class="
                    {
                        'fullSize': true,
                        'pendingTxn': props.currentItem.isTypePending && !props.currentItem.isResolved,
                        'resolvedTxn': props.currentItem.isTypePending && props.currentItem.isResolved,
                    }">
                        <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem["date"]) }}</div>
                        <div class="listItemTitle middleLeft">
                            {{ props.currentItem["title"] }}
                            <div v-if="props.currentItem.isTypePending && !props.currentItem.isResolved" class="pendingLabel">(Pending)</div>
                            <div v-if="props.currentItem.isTypePending && props.currentItem.isResolved" class="resolvedLabel">(Resolved)</div>
                        </div>
                        <div :title="getAmountTooltip(props.currentItem)" class="listItemTitle middleRight">
                            {{ store.formatAmount(props.currentItem, 'from') }}
                        </div>
                    </grid-shortcut>
                </template>
            </list-cell>

            <list-cell v-area="'_30dIncomesList'" title="30d Incomes" :noItemsText="'No Incomes'"
            :items="store.toReversed(store.dashboardSummary.incomes30d ?? [])">
                <template #row="props">
                    <grid-shortcut columns="50px 1fr 1fr" class="fullSize">
                        <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem["date"]) }}</div>
                        <div class="listItemTitle middleLeft">{{ props.currentItem["title"] }}</div>
                        <div :title="getAmountTooltip(props.currentItem)" class="listItemTitle middleRight">
                            {{ store.formatAmount(props.currentItem, 'to') }}
                        </div>
                    </grid-shortcut>
                </template>
            </list-cell>

            <list-cell v-area="'ContainersList'" title="Containers" :noItemsText="'No Containers'"
            :items="store.toSorted(store.containers ?? [], (a:any,b:any) => { return b.value - a.value; })">
                <template #row="props">
                    <grid-shortcut :title="getContainerTooltip(props.currentItem)" columns="1fr 1fr" class="fullSize">
                        <div class="listItemTitle middleLeft">{{ props.currentItem.name }}</div>
                        <div class="listItemTitle middleRight">{{ props.currentItem.value.toFixed(2) }} HKD</div>
                    </grid-shortcut>
                </template>
            </list-cell>

            <total-value-graph-cell v-area="'TotalValueGraph'"
            title="Total Value"></total-value-graph-cell>

            <container-values-graph-cell v-area="'containerValuesGraph'"
            title="Containers Value"></container-values-graph-cell>
        
        </grid-shortcut>
    </div>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    overflow-x:hidden; .fullSize; padding:50px; box-sizing: border-box;
    font-family: 'Schibsted Grotesk', sans-serif;
    background-image: url('../assets/gradient.png');
    background-size: COVER;

    .pendingTxn { color:@yellow !important; }
    .resolvedTxn { .fg(inherit); }
    .pendingLabel { font-weight: bold; margin-left:5px; }
    .resolvedLabel { font-weight: bold; margin-left:5px; }
    
    #mainGrid
    {
        box-sizing: border-box; gap:15px;
        .fullSize; .gridColumns_4;
        grid-template-rows:100px 220px 220px 200px 1fr;
        height:2000px; .fg(gray);

        grid-template-areas: 
        'expensesPanel incomesPanel totalValuePanel netChangePanel' 
        '_30dExpensesList _30dExpensesList ContainersList ContainersList'
        '_30dIncomesList _30dIncomesList TotalValueGraph TotalValueGraph'
        '_allPendingTransactionsList _allPendingTransactionsList containerValuesGraph containerValuesGraph';

        .listItemTitle 
        {
            .fg(inherit); font-size:14px; overflow:hidden; white-space: nowrap; text-overflow: ellipsis; 
        }
    }
}

@media only screen and (max-width: 600px) 
{
    #mainGrid
    {
        gap:15px !important;
        grid-template-columns: 1fr 1fr !important;
        grid-template-rows: 100px 100px 250px 250px 250px 250px 250px 250px 1fr !important;
        grid-template-areas: 
        'expensesPanel incomesPanel' 
        'totalValuePanel netChangePanel' 
        '_30dExpensesList _30dExpensesList'
        'ContainersList ContainersList'
        '_30dIncomesList _30dIncomesList'
        'TotalValueGraph TotalValueGraph'
        '_allPendingTransactionsList _allPendingTransactionsList'
        'containerValuesGraph containerValuesGraph' !important;
    }
}

</style>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import type { containers, transactions } from "@prisma/client";
import vArea from "snippets/vite-vue-ts/directives/vArea";

export default 
{
    directives: {'area':vArea},
    data()
    {
        return { store: useMainStore() };
    },
    mounted() { this.store.updateAll(); },
    methods:
    {
        getAmountTooltip(txn: any)
        {
            if (txn == undefined) return "";
            return txn.changeInValue.toFixed(3) + ' HKD';
        },
        getContainerTooltip(container: any)
        {
            if (container == undefined) return "";
            let output = "";
            for (let [key, value] of Object.entries(container.balance))
            {
                let currency = this.store.currencies.find(curr => curr.pubID == key);
                output += `${currency?.symbol}: ${(value as any).toFixed(3)}\n`;
            }
            return output;
        }
    }
}
</script>