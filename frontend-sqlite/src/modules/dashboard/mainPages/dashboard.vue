<template>
    <div id="topDiv">
        <div id="topDivInner">

            <view-title class="pageTitle" :title="'Dashboard'" />

            <grid-shortcut id="mainGrid">

                <number-cell title="Expenses" :noItemsText="'No Data'" v-area="'expensesPanel'"
                style="background: linear-gradient(-45deg, rgba(213, 51, 105, 0.13) 0%, rgba(218, 81, 81, 0.42) 100%); color:white;"
                :value7d="userExpensesIncomes ? parseFloat(userExpensesIncomes.expenses7d) : 0"
                :value30d="userExpensesIncomes ? parseFloat(userExpensesIncomes.expenses30d) : 0"
                :valueAll="userExpensesIncomes ? parseFloat(userExpensesIncomes.expensesTotal) : 0"
                :isLoading="store.userExpensesIncomes.isLoading" :networkError="store.userExpensesIncomes.error"></number-cell>

                <number-cell title="Incomes" :noItemsText="'No Data'" v-area="'incomesPanel'"
                style="background: linear-gradient(-45deg, rgba(56, 213, 51, 0.09) 0%, rgba(81, 218, 90, 0.35) 100%); color:white;"
                :value7d="userExpensesIncomes ? parseFloat(userExpensesIncomes.incomes7d) : 0"
                :value30d="userExpensesIncomes ? parseFloat(userExpensesIncomes.incomes30d) : 0"
                :valueAll="userExpensesIncomes ? parseFloat(userExpensesIncomes.incomesTotal) : 0"
                :isLoading="store.userExpensesIncomes.isLoading" :networkError="store.userExpensesIncomes.error"></number-cell>       

                <number-cell title="Total Value" v-area="'totalValuePanel'"
                style="background: linear-gradient(-45deg, rgba(213, 180, 51, 0.09) 0%, rgba(218, 203, 81, 0.44) 100%); color:white;"
                :valueAll="userTotalValue"
                :isLoading="store.userExpensesIncomes.isLoading" :networkError="store.userExpensesIncomes.error"></number-cell>

                <number-cell title="Net Change" :noItemsText="'No Data'"
                :value7d="netChange7d" :value30d="netChange30d" v-area="'netChangePanel'"
                style="background: linear-gradient(-45deg, rgba(51, 213, 190, 0.09) 0%, rgba(81, 218, 218, 0.43) 100%); color:white;"
                :isLoading="store.userExpensesIncomes.isLoading" :networkError="store.userExpensesIncomes.error"></number-cell>

                <list-cell v-area="'_30dExpensesList'" title="30d Expenses" :noItemsText="'No Expenses'"
                :isLoading="store.txns30d.isLoading"
                :error="store.txns30d.error"
                :itemsInPage="6"
                :items="expenseTxns30d">
                    <template #row="props">
                        <grid-shortcut columns="50px 1fr 1fr" :class="{'fullSize': true}" @click="viewTxn(props.currentItem.id)" class="fullSize highlightableRow">
                            <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem.creationDate) }}</div>
                            <div class="listItemTitle middleLeft">
                                {{ props.currentItem["title"] }}
                            </div>
                            <div class="listItemTitle middleRight">
                                {{ currenciesStore.formatAmount(props.currentItem) }}
                            </div>
                        </grid-shortcut>
                    </template>
                </list-cell>

                <list-cell v-area="'_30dIncomesList'" title="30d Incomes" :noItemsText="'No Incomes'"
                :isLoading="store.txns30d.isLoading"
                :error="store.txns30d.error"
                :itemsInPage="6"
                :items="incomeTxns30d">
                    <template #row="props">
                        <grid-shortcut columns="50px 1fr 1fr" :class="{'fullSize': true}" @click="viewTxn(props.currentItem.id)" class="fullSize highlightableRow">
                            <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem.creationDate) }}</div>
                            <div class="listItemTitle middleLeft">
                                {{ props.currentItem["title"] }}
                            </div>
                            <div class="listItemTitle middleRight">
                                {{ currenciesStore.formatAmount(props.currentItem) }}
                            </div>
                        </grid-shortcut>
                    </template>
                </list-cell>

                <list-cell v-area="'_30dTransfersList'" title="30d Transfers" :noItemsText="'No Transfers'" 
                :isLoading="store.txns30d.isLoading"
                :error="store.txns30d.error"
                :itemsInPage="6"
                :items="transferTxns30d">
                    <template #row="props">
                        <grid-shortcut columns="50px 1fr 1fr" :class="{'fullSize': true}" @click="viewTxn(props.currentItem.id)" class="fullSize highlightableRow">
                            <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem.creationDate) }}</div>
                            <div class="listItemTitle middleLeft">
                                {{ props.currentItem["title"] }}
                            </div>
                            <div class="listItemTitle middleRight">
                                {{ currenciesStore.formatAmount(props.currentItem) }}
                            </div>
                        </grid-shortcut>
                    </template>
                </list-cell>

                <networthHistoryCell v-area="'NetworthGraph'"/>

                <!--
                <list-cell v-area="'_allPendingTransactionsList'" title="All Pending Txns" :noItemsText="'No Pending Txns'"
                :isLoading="store.dashboardSummary.isLoading"
                :error="store.dashboardSummary.error"
                :items="store.dashboardSummary?.lastSuccessfulData?.allPendingTransactions ?? []">
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
                :isLoading="store.dashboardSummary.isLoading"
                :error="store.dashboardSummary.error"
                :items="store.toReversed(store.dashboardSummary?.lastSuccessfulData?.incomes30d ?? [])">
                    <template #row="props">
                        <grid-shortcut columns="50px 1fr 1fr" @click="viewTxn(props.currentItem['pubID'])"
                        class="fullSize highlightableRow">
                            <div class="listItemTitle middleLeft">{{ store.getDateAge(props.currentItem["date"]) }}</div>
                            <div class="listItemTitle middleLeft">{{ props.currentItem["title"] }}</div>
                            <div :title="getAmountTooltip(props.currentItem)" class="listItemTitle middleRight">
                                {{ store.formatAmount(props.currentItem, 'to') }}
                            </div>
                        </grid-shortcut>
                    </template>
                </list-cell>-->

                <list-cell v-area="'ContainersList'" title="Containers" :noItemsText="'No Containers'"
                :isLoading="containersStore.containers.isLoading"
                :error="containersStore.containers.error"
                :items="store.toSorted(containersStore.containers.lastSuccessfulData?.rangeItems ?? [], (a,b) => parseFloat(b.value) - parseFloat(a.value))">
                    <template #row="props">
                        <grid-shortcut columns="1fr 1fr" class="fullSize">
                            <div class="listItemTitle middleLeft">{{ props.currentItem.name }}</div>
                            <div class="listItemTitle middleRight">{{ props.currentItem.value }} {{ currenciesStore.getBaseCurrencySymbol() }}</div>
                        </grid-shortcut>
                    </template>
                </list-cell>

                <container-values-graph-cell v-area="'containerValuesGraph'"
                title="Containers Value"></container-values-graph-cell>

            </grid-shortcut>
        </div>
    </div>
</template>

<script lang="ts">
import { useMainStore } from "@/modules/core/stores/store";
import { useContainersStore } from '@/modules/containers/stores/useContainersStore';
import { useTxnTypesStore } from '../../txnTypes/stores/useTxnTypesStore';
import { getTxnClassification } from '@/modules/transactions/utils/transactions';
import type { HydratedTransaction } from "@/types/dtos/transactionsDTO";
import vArea from "@/modules/core/directives/vArea";
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import listCellVue from '@/modules/core/components/listCell.vue';
import cell from '@/modules/core/components/cell.vue';
import containerValuesGraphCell from '@/modules/containers/components/containerValuesGraphCell.vue';
import router from "@/router";
import networthHistoryCell from "../components/networthHistoryCell.vue";

export default
{
    directives: {'area':vArea},
    components: { "list-cell": listCellVue, "cell": cell, containerValuesGraphCell, networthHistoryCell },
    data()
    {
        let data =
        {
            store: useMainStore(),
            currenciesStore: useCurrenciesStore(),
            containersStore: useContainersStore(),
            txnTypesStore: useTxnTypesStore(),
            selectedItem: 'Main'
        };
        return data;
    },
    mounted()
    {
        // this.store.updateAll();
        this.store.updateDashboardBatch();
        // this.store.balanceValueHistory.updateData();
        this.txnTypesStore.txnTypes.updateData();
        this.store.userExpensesIncomes.updateData();
        this.store.txns30d.updateData();
        this.currenciesStore.currencies.updateData();
    },
    computed:
    {
        netChange30d()
        {
            if (this.store.userExpensesIncomes.isLoading || this.store.userExpensesIncomes.error) return 0;
            if (!this.userExpensesIncomes?.incomes30d || !this.userExpensesIncomes?.expenses30d) return 0;
            return (parseFloat(this.userExpensesIncomes.incomes30d) - parseFloat(this.userExpensesIncomes.expenses30d));
        },
        netChange7d()
        {
            if (this.store.userExpensesIncomes.isLoading || this.store.userExpensesIncomes.error) return 0;
            if (!this.userExpensesIncomes?.incomes7d || !this.userExpensesIncomes?.expenses7d) return 0;
            return (parseFloat(this.userExpensesIncomes.incomes7d) - parseFloat(this.userExpensesIncomes.expenses7d));
        },
        userTotalValue()
        {
            if (this.store.userExpensesIncomes.isLoading || this.store.userExpensesIncomes.error) return 0;
            if (!this.userExpensesIncomes?.incomes7d || !this.userExpensesIncomes?.expenses7d) return 0;
            return (parseFloat(this.userExpensesIncomes.incomesTotal) - parseFloat(this.userExpensesIncomes.expensesTotal));
        },
        userExpensesIncomes()
        {
            return this.store.userExpensesIncomes?.lastSuccessfulData;
        },
        expenseTxns30d()
        {
            if (!this.store.txns30d.lastSuccessfulData) return [];
            return this.store.txns30d.lastSuccessfulData.rangeItems.filter(txn => getTxnClassification(txn) === 'Expense');
        },
        incomeTxns30d()
        {
            if (!this.store.txns30d.lastSuccessfulData) return [];
            return this.store.txns30d.lastSuccessfulData.rangeItems.filter(txn => getTxnClassification(txn) === 'Income');
        },
        transferTxns30d()
        {
            if (!this.store.txns30d.lastSuccessfulData) return [];
            return this.store.txns30d.lastSuccessfulData.rangeItems.filter(txn => getTxnClassification(txn) === 'Transfer');
        }
    },
    methods:
    {
        getAmountTooltip(txn: HydratedTransaction)
        {
            if (txn == undefined) return "";
            return txn.changeInValue.toFixed(3) + ' HKD';
        },
        // getContainerTooltip(container: ValueHydratedContainer)
        // {
        //     if (container == undefined) return "";
        //     let output = "";
        //     for (let [key, value] of Object.entries(container.balance))
        //     {
        //         let currency = (this.store.currencies.lastSuccessfulData ?? []).find(curr => curr.id == key);
        //         output += `${currency?.ticker}: ${(value as any).toFixed(3)}\n`;
        //     }
        //     return output;
        // },
        viewTxn(id:string)
        {
            router.push({name: 'transactions', params: { id: id }})
        }
    }
}
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

#topDiv
{
    container-type: size;
    container-name: topDiv;
    
    .pageTitle
    {
        margin-top: @desktopPagePadding;
        padding-left: @desktopPagePadding;
        // &:deep(#innerContainer) { font-size: inherit }
    }

    overflow-x:hidden; .fullSize; box-sizing: border-box;
    font-family: 'Schibsted Grotesk', sans-serif;
    background: transparent;

    .pendingTxn { color:@yellow !important; }
    .resolvedTxn { .fg(inherit); }
    .pendingLabel { font-weight: bold; margin-left:5px; }
    .resolvedLabel { font-weight: bold; margin-left:5px; }

    #mainGrid
    {
        padding: @desktopPagePadding;
        box-sizing: border-box; gap:15px;
        .fullSize; .gridColumns_4;
        grid-template-rows:100px 220px 220px 220px 1fr;
        height:2000px; .fg(gray);

        grid-template-areas:
        'expensesPanel incomesPanel totalValuePanel netChangePanel'
        '_30dExpensesList _30dExpensesList ContainersList ContainersList'
        '_30dIncomesList _30dIncomesList NetworthGraph NetworthGraph'
        '_30dTransfersList _30dTransfersList containerValuesGraph containerValuesGraph';

        .listItemTitle
        {
            .fg(inherit); font-size:14px; overflow:hidden; white-space: nowrap; text-overflow: ellipsis; 
        }

        .highlightableRow
        {
            cursor:pointer;
            &:hover { color: @focus; }
        }
    }
}

@container topDiv (width <= 800px)
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
        'NetworthGraph NetworthGraph'
        '_30dTransfersList _30dTransfersList'
        'containerValuesGraph containerValuesGraph' !important;
    }
}

@container topDiv (width <= 500px)
{
    #topDivInner > #mainGrid { padding: @mobilePagePadding !important; }

    .pageTitle
    {
        margin-top: @mobilePagePadding !important;
        padding-left: @mobilePagePadding !important;
    }

    // #pageTitle { display: none; }

    #mainGrid
    {
        gap:15px !important;
        grid-template-columns: 1fr !important;
        grid-template-rows: 100px 100px 100px 100px 250px 250px 250px 250px 250px 250px 1fr !important;
        grid-template-areas:
        'expensesPanel'
        'incomesPanel'
        'totalValuePanel'
        'netChangePanel'
        '_30dExpensesList'
        'ContainersList'
        '_30dIncomesList'
        'NetworthGraph'
        '_30dTransfersList'
        'containerValuesGraph' !important;
    }
}

</style>