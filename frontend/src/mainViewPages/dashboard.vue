<template>
    <div id="topDiv">
        <grid-shortcut id="mainGrid">

             <grid-area area="expensesPanel">
                <number-cell title="Expenses"
                :value7d="store.dashboardSummary.totalExpenses7d"
                :value30d="store.dashboardSummary.totalExpenses30d"
                :valueAll="store.dashboardSummary.totalExpenses"></number-cell>
            </grid-area>

            <grid-area area="incomesPanel">
                <number-cell title="Incomes"
                :value7d="store.dashboardSummary.totalIncomes7d"
                :value30d="store.dashboardSummary.totalIncomes30d"
                :valueAll="store.dashboardSummary.totalIncomes"></number-cell>
            </grid-area>

            <grid-area area="totalValuePanel">
                <number-cell title="Total Value"
                :valueAll="store.dashboardSummary.totalValue"></number-cell>
            </grid-area>

            <grid-area area="netChangePanel">
                <number-cell title="Net Change"
                :value7d="(store.dashboardSummary.totalIncomes7d - store.dashboardSummary.totalExpenses7d) ?? 0"
                :value30d="(store.dashboardSummary.totalIncomes30d - store.dashboardSummary.totalExpenses30d) ?? 0"></number-cell>
            </grid-area>

            <grid-area area="30dExpensesList">
                <list-cell title="30d Expenses" :items="store.toReversed(store.dashboardSummary.expenses30d ?? [])">
                <template #row="props">
                    <grid-shortcut columns="50px 1fr 1fr" class="fullSize">
                        <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem["date"]) }}</div>
                        <div class="listItemTitle middleLeft">{{ props.currentItem["title"] }}</div>
                        <div class="listItemTitle middleRight">{{ store.formatAmount(props.currentItem, 'from') }}</div>
                    </grid-shortcut>
                </template>
                </list-cell>
            </grid-area>

            <grid-area area="30dIncomesList">
                <list-cell title="30d Incomes" :items="store.toReversed(store.dashboardSummary.incomes30d ?? [])">
                <template #row="props">
                    <grid-shortcut columns="50px 1fr 1fr" class="fullSize">
                        <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem["date"]) }}</div>
                        <div class="listItemTitle middleLeft">{{ props.currentItem["title"] }}</div>
                        <div class="listItemTitle middleRight">{{ store.formatAmount(props.currentItem, 'to') }}</div>
                    </grid-shortcut>
                </template>
                </list-cell>
            </grid-area>
        
        </grid-shortcut>
    </div>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    overflow-x:hidden; .fullSize;
    font-family: 'Schibsted Grotesk', sans-serif;
    
    #mainGrid
    {
        padding:50px; box-sizing: border-box; gap:15px;
        .fullSize; grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows:100px 250px 1fr 1fr;
        height:2000px;

        grid-template-areas: 
        'expensesPanel incomesPanel totalValuePanel netChangePanel' 
        '30dExpensesList 30dIncomesList _ _';

        .listItemTitle { color:gray; font-size:14px; overflow:hidden; white-space: nowrap; text-overflow: ellipsis; }
    }
}
</style>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import type { transactions } from "@prisma/client";
export default 
{
    data()
    {
        return {
            store: useMainStore()
        };
    },
    mounted()
    {
        this.store.updateAll();
    }
}
</script>

