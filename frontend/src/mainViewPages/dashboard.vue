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

            <grid-area area="_30dExpensesList">
                <list-cell title="30d Expenses" :items="store.toReversed(store.dashboardSummary.expenses30d ?? [])">
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
            </grid-area>

            <grid-area area="_allPendingTransactionsList">
                <list-cell title="All Pending Txns" :items="store.dashboardSummary?.allPendingTransactions ?? []">
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
            </grid-area>

            <grid-area area="_30dIncomesList">
                <list-cell title="30d Incomes" :items="store.toReversed(store.dashboardSummary.incomes30d ?? [])">
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
            </grid-area>

            <grid-area area="ContainersList">
                <list-cell title="Containers" :items="store.toSorted(store.containers ?? [], (a:any,b:any) => { return b.value - a.value; })">
                    <template #row="props">
                        <grid-shortcut :title="getContainerTooltip(props.currentItem)" columns="1fr 1fr" class="fullSize">
                            <div class="listItemTitle middleLeft">{{ props.currentItem.name }}</div>
                            <div class="listItemTitle middleRight">{{ props.currentItem.value.toFixed(2) }} HKD</div>
                        </grid-shortcut>
                    </template>
                </list-cell>
            </grid-area>

            <grid-area area="TotalValueGraph">
                <total-value-graph-cell title="Total Value"></total-value-graph-cell>
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

    .pendingTxn { color:@yellow !important; }
    .resolvedTxn { .fg(inherit); }
    .pendingLabel { font-weight: bold; margin-left:5px; }
    .resolvedLabel { font-weight: bold; margin-left:5px; }
    
    #mainGrid
    {
        padding:50px; box-sizing: border-box; gap:15px;
        .fullSize; .gridColumns_4;
        grid-template-rows:100px 250px 250px 250px 1fr;
        height:2000px; .fg(gray);

        grid-template-areas: 
        'expensesPanel incomesPanel totalValuePanel netChangePanel' 
        '_30dExpensesList _30dExpensesList ContainersList ContainersList'
        '_30dIncomesList _30dIncomesList TotalValueGraph TotalValueGraph'
        '_allPendingTransactionsList _allPendingTransactionsList _1 _2';

        .listItemTitle 
        {
            .fg(inherit); font-size:14px; overflow:hidden; white-space: nowrap; text-overflow: ellipsis; 
        }
    }
}
</style>

<script lang="ts">
import { useMainStore } from "@/stores/store";
import type { containers, transactions } from "@prisma/client";
export default 
{
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