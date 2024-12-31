<template>
    <div id="topDiv">
        <div id="topDivInner">

            <view-title class="pageTitle" :title="'Dashboard'" />

            <grid-shortcut id="mainGrid">

                <number-cell :noItemsText="'No Data'" v-area="'expensesPanel'"
                             style="background: linear-gradient(-45deg, rgba(213, 51, 105, 0.13) 0%, rgba(218, 81, 81, 0.42) 100%); color:white;"
                             :option-values="userExpenses"
                             initial-selected-option="M"
                             :isLoading="store.userExpensesIncomes.isLoading"
                             :networkError="store.userExpensesIncomes.error">
                    <template #title>
                        <TipsIconTitle>
                            <div style="display: inline-block">Expenses</div>
                            <template #tipsContent>
                                <div>Sum of value change of all transactions that incurred negative change in value.</div>
                                <div>Currencies rate at the time of the transaction will be used for calculations.</div>
                                <br />
                                <div>Choosing 'M' counts all transactions after the start of the current month ({{ formatDate(new Date(getCurrentMonthStartEpoch())) }}).</div>
                                <div>Choosing 'W' counts all transactions after the start of the current week ({{ formatDate(new Date(getStartOfWeekEpoch())) }}).</div>
                            </template>
                        </TipsIconTitle>
                    </template>
                </number-cell>

                <number-cell :noItemsText="'No Data'" v-area="'incomesPanel'"
                             style="background: linear-gradient(-45deg, rgba(56, 213, 51, 0.09) 0%, rgba(81, 218, 90, 0.35) 100%); color:white;"
                             :option-values="userIncomes"
                             initial-selected-option="M"
                             :isLoading="store.userExpensesIncomes.isLoading"
                             :networkError="store.userExpensesIncomes.error">
                    <template #title>
                        <TipsIconTitle>
                            <div style="display: inline-block">Incomes</div>
                            <template #tipsContent>
                                <div>Sum of value change of all transactions that incurred positive change in value.</div>
                                <div>Currencies rate at the time of the transaction will be used for calculations.</div>
                                <br />
                                <div>Choosing 'M' counts all transactions after the start of the current month ({{ formatDate(new Date(getCurrentMonthStartEpoch())) }}).</div>
                                <div>Choosing 'W' counts all transactions after the start of the current week ({{ formatDate(new Date(getStartOfWeekEpoch())) }}).</div>
                            </template>
                        </TipsIconTitle>
                    </template>
                </number-cell>

                <number-cell :noItemsText="'No Data'" v-area="'networthPanel'"
                             v-model:selected-option="selectedNetworthRange"
                             style="background: linear-gradient(-45deg, rgba(213, 180, 51, 0.09) 0%, rgba(218, 203, 81, 0.44) 100%); color:white;"
                             :option-values="userNetworth.networthOptionValues"
                             :isLoading="userNetworth.isLoading"
                             :networkError="userNetworth.error">
                    <template #title>
                        <TipsIconTitle>
                            <div style="display: inline-block">Networth</div>
                            <template #tipsContent>
                                <div>Networth</div>
                            </template>
                        </TipsIconTitle>
                    </template>
                </number-cell>

                <number-cell :noItemsText="'No Data'" v-area="'netChangePanel'"
                             v-model:selected-option="selectedNetworthChangeRange"
                             style="background: linear-gradient(-45deg, rgba(51, 213, 190, 0.09) 0%, rgba(81, 218, 218, 0.43) 100%); color:white;"
                             :option-values="userNetworthChange.networthChangeOptionValues"
                             :isLoading="userNetworthChange.isLoading"
                             :networkError="userNetworthChange.error">
                    <template #title>
                        <TipsIconTitle>
                            <div style="display: inline-block">Networth Change</div>
                            <template #tipsContent>
                                <div>The change in networth, this includes all containers, currencies and transactions.</div>
                                <div>Currencies rate at the time of the transaction will be used for calculations.</div>
                            </template>
                        </TipsIconTitle>
                    </template>
                </number-cell>

                <ListCell v-area="'_30dExpensesList'" :noItemsText="'No Expenses'"
                :isLoading="store.txns30d.isLoading"
                :error="store.txns30d.error"
                :itemsInPage="6"
                :items="expenseTxns30d">
                    <template #title>
                        <TipsIconTitle>
                            30d Expenses
                            <template #tipsContent>
                                <div>All expenses in the past 30 days.</div>
                                <div>All transactions incurring negative change in value will be considered "expenses", except for those marked otherwise.</div>
                            </template>
                        </TipsIconTitle>
                    </template>
                    <template #row="props">
                        <TxnTooltip :txn="props.currentItem">
                            <grid-shortcut columns="50px 1fr 1fr" :class="{'fullSize': true}" @click="viewTxn(props.currentItem.id)" class="fullSize highlightableRow">
                                <div class="listItemTitle middleLeft">{{ getDateAge(props.currentItem.creationDate) }}</div>
                                <div class="listItemTitle middleLeft">
                                    <div class="ellipsis">{{ props.currentItem.title }}</div>
                                </div>
                                <div class="listItemTitle middleRight">
                                    {{ props.currentItem.changeInValue }} {{ currenciesStore.getBaseCurrencySymbol() }}
                                </div>
                            </grid-shortcut>
                        </TxnTooltip>
                    </template>
                </ListCell>

                <ListCell v-area="'_30dIncomesList'" :noItemsText="'No Incomes'"
                :isLoading="store.txns30d.isLoading"
                :error="store.txns30d.error"
                :itemsInPage="6"
                :items="incomeTxns30d">
                    <template #title>
                        <TipsIconTitle>
                            30d Incomes
                            <template #tipsContent>
                                <div>All incomes in the past 30 days.</div>
                                <div>All transactions incurring positive change in value will be considered "incomes", except for those marked otherwise.</div>
                            </template>
                        </TipsIconTitle>
                    </template>
                    <template #row="props">
                        <TxnTooltip :txn="props.currentItem">
                            <grid-shortcut columns="50px 1fr 1fr" :class="{'fullSize': true}" @click="viewTxn(props.currentItem.id)" class="fullSize highlightableRow">
                                <div class="listItemTitle middleLeft">{{ getDateAge(props.currentItem.creationDate) }}</div>
                                <div class="listItemTitle middleLeft">
                                    <div class="ellipsis">{{ props.currentItem.title }}</div>
                                </div>
                                <div class="listItemTitle middleRight">
                                    {{ props.currentItem.changeInValue }} {{ currenciesStore.getBaseCurrencySymbol() }}
                                </div>
                            </grid-shortcut>
                        </TxnTooltip>
                    </template>
                </ListCell>

                <ListCell v-area="'_30dTransfersList'" :noItemsText="'No Transfers'"
                :isLoading="store.txns30d.isLoading"
                :error="store.txns30d.error"
                :itemsInPage="6"
                :items="transferTxns30d">
                    <template #title>
                        <TipsIconTitle>
                            30d Transfers
                            <template #tipsContent>
                                <div>All transfers in the past 30 days.</div>
                                <div>All transactions incurring zero change in value will be considered "transfers", except for those marked otherwise.</div>
                            </template>
                        </TipsIconTitle>
                    </template>
                    <template #row="props">
                        <TxnTooltip :txn="props.currentItem">
                            <grid-shortcut columns="50px 1fr 1fr" :class="{'fullSize': true}" @click="viewTxn(props.currentItem.id)" class="fullSize highlightableRow">
                                <div class="listItemTitle middleLeft">{{ getDateAge(props.currentItem.creationDate) }}</div>
                                <div class="listItemTitle middleLeft">
                                    <div class="ellipsis">{{ props.currentItem.title }}</div>
                                </div>
                                <div class="listItemTitle middleRight">
                                    {{ props.currentItem.changeInValue }} {{ currenciesStore.getBaseCurrencySymbol() }}
                                </div>
                            </grid-shortcut>
                        </TxnTooltip>
                    </template>
                </ListCell>

                <NetworthHistoryCell v-area="'NetworthGraph'"/>

                <!--
                <ListCell v-area="'_allPendingTransactionsList'" title="All Pending Txns" :noItemsText="'No Pending Txns'"
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
                </ListCell>

                <ListCell v-area="'_30dIncomesList'" title="30d Incomes" :noItemsText="'No Incomes'"
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
                </ListCell>-->

                <ListCell v-area="'ContainersList'" :noItemsText="'No Containers'"
                :isLoading="containersStore.containers.isLoading"
                :error="containersStore.containers.error"
                :itemsInPage="6"
                :items="store.toSorted(containersStore.containers.lastSuccessfulData?.rangeItems ?? [], (a,b) => parseFloat(b.value) - parseFloat(a.value))">
                    <template #title>Containers</template>
                    <template #row="props">
                        <grid-shortcut columns="1fr 1fr" class="fullSize">
                            <div class="listItemTitle middleLeft">
                                <div class="ellipsis">{{ props.currentItem.name }}</div>
                            </div>
                            <div class="listItemTitle middleRight ">
                                <div class="ellipsis">
                                    {{ parseFloat(props.currentItem.value).toFixed(2) }} {{ currenciesStore.getBaseCurrencySymbol() }}
                                </div>
                            </div>
                        </grid-shortcut>
                    </template>
                </ListCell>

                <ContainerValuesGraphCell v-area="'containerValuesGraph'">
                    <template #title>Containers Value</template>
                </ContainerValuesGraphCell>

            </grid-shortcut>
        </div>
    </div>
</template>

<script lang="ts">
import { useMainStore } from "@/modules/core/stores/store";
import { useContainersStore } from '@/modules/containers/stores/useContainersStore';
import { useTxnTagsStore } from '../../txnTypes/stores/useTxnTypesStore';
import { getTxnClassification } from '@/modules/transactions/utils/transactions';
import type { HydratedTransaction } from "@/types/dtos/transactionsDTO";
import vArea from "@/modules/core/directives/vArea";
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import cell from '@/modules/core/components/data-display/Cell.vue';
import ContainerValuesGraphCell from '@/modules/containers/components/ContainerValuesGraphCell.vue';
import router from "@/router";
import numberCell from "@/modules/core/components/data-display/NumberCell.vue";
import NetworthHistoryCell from "../components/NetworthHistoryCell.vue";
import { useNetworthHistoryStore } from "@/modules/charts/stores/networthHistoryStore";
import { Uncontrolled } from "@/modules/core/utils/defineProperty";
import { formatDate, getCurrentMonthStartEpoch, getDateAge, getStartOfWeekEpoch } from "@/modules/core/utils/date";
import TxnTooltip from "@/modules/transactions/components/TxnTooltip.vue";
import ListCell from "@/modules/core/components/data-display/ListCell.vue";
import TipsIcon from "@/modules/core/components/data-display/TipsIcon.vue";
import TipsIconTitle from "@/modules/core/components/data-display/TipsIconTitle.vue";

export default
{
    directives: {'area':vArea},
    components: { TipsIconTitle, ListCell, "cell": cell, ContainerValuesGraphCell, NetworthHistoryCell, numberCell, TxnTooltip, TipsIcon },
    data()
    {
        let data =
        {
            store: useMainStore(),
            currenciesStore: useCurrenciesStore(),
            containersStore: useContainersStore(),
            txnTypesStore: useTxnTagsStore(),
            networthHistoryStore: useNetworthHistoryStore(),
            selectedItem: 'Main',
            selectedNetworthRange: 'now' as '30d' | '7d' | 'now',
            selectedNetworthChangeRange: '30d' as '30d' | '7d',
            uncontrolledSymbol: Uncontrolled as typeof Uncontrolled,
            selectedOption: '30d'
        };
        return data;
    },
    mounted()
    {
        // this.store.updateAll();
        this.store.updateDashboardBatch();
        // this.store.balanceValueHistory.updateData();
        this.txnTypesStore.txnTags.updateData();
        this.store.userExpensesIncomes.updateData();
        this.store.txns30d.updateData();
        this.currenciesStore.currencies.updateData();
    },
    computed:
    {
        userNetworth()
        {
            const dateCutoff = (() =>
            {
                if (this.selectedNetworthRange === '30d') return Date.now() - 2_592_000_000;
                else if (this.selectedNetworthRange === '7d') return Date.now() - 604_800_000;
                return Date.now() - 0;
            })();

            const targetComposableToUse = (() =>
            {
                // If user selected 30d, use the hooks for 30d or all, whatever is loaded. Use 30d if both unloaded.
                if (this.selectedNetworthRange === '30d')
                {
                    if (!!this.networthHistoryStore._30d.lastSuccessfulData || this.networthHistoryStore._30d.isLoading) return this.networthHistoryStore._30d;
                    if (!!this.networthHistoryStore._all.lastSuccessfulData || this.networthHistoryStore._all.isLoading) return this.networthHistoryStore._all;
                    return this.networthHistoryStore._30d;
                }

                if (!!this.networthHistoryStore._7d.lastSuccessfulData || this.networthHistoryStore._7d.isLoading) return this.networthHistoryStore._7d;
                if (!!this.networthHistoryStore._30d.lastSuccessfulData || this.networthHistoryStore._30d.isLoading) return this.networthHistoryStore._30d;
                if (!!this.networthHistoryStore._all.lastSuccessfulData || this.networthHistoryStore._all.isLoading) return this.networthHistoryStore._all;
                return this.networthHistoryStore._30d;
            })();

            if (!targetComposableToUse.lastSuccessfulData && !targetComposableToUse.isLoading)
                targetComposableToUse.updateData();


            if (targetComposableToUse.error || targetComposableToUse.isLoading || !targetComposableToUse.lastSuccessfulData)
            {
                return {
                    isLoading: targetComposableToUse.isLoading,
                    networthOptionValues: { '30d': 0, '7d': 0, 'now': 0 },
                    error: targetComposableToUse.error
                };
            }

            const map = targetComposableToUse.lastSuccessfulData.map;

            const networthAtRequestedEpoch = parseFloat
            (
                Object.keys(map)
                .map(x =>
                {
                    return {
                        timeDelta: Math.abs(parseInt(x) - dateCutoff),
                        value: map[x]
                    }
                })
                .sort((a,b) => (b.timeDelta - a.timeDelta))
                .reverse()[0].value
            );

            const uniformNetworthValue = networthAtRequestedEpoch;

            return {
                isLoading: targetComposableToUse.isLoading,
                networthOptionValues: { '30d': uniformNetworthValue, '7d': uniformNetworthValue, 'now': uniformNetworthValue },
                error: targetComposableToUse.error
            };
        },
        userNetworthChange()
        {
            const dateCutoff = (() =>
            {
                if (this.selectedNetworthChangeRange === '30d') return Date.now() - 2_592_000_000;
                return Date.now() - 604_800_000;
            })();

            const targetComposableToUse = (() =>
            {
                // If user selected 30d, use the hooks for 30d or all, whatever is loaded. Use 30d if both unloaded.
                if (this.selectedNetworthChangeRange === '30d')
                {
                    if (!!this.networthHistoryStore._30d.lastSuccessfulData || this.networthHistoryStore._30d.isLoading) return this.networthHistoryStore._30d;
                    if (!!this.networthHistoryStore._all.lastSuccessfulData || this.networthHistoryStore._all.isLoading) return this.networthHistoryStore._all;
                    return this.networthHistoryStore._30d;
                }

                if (!!this.networthHistoryStore._7d.lastSuccessfulData || this.networthHistoryStore._7d.isLoading) return this.networthHistoryStore._7d;
                if (!!this.networthHistoryStore._30d.lastSuccessfulData || this.networthHistoryStore._30d.isLoading) return this.networthHistoryStore._30d;
                if (!!this.networthHistoryStore._all.lastSuccessfulData || this.networthHistoryStore._all.isLoading) return this.networthHistoryStore._all;
                return this.networthHistoryStore._30d;
            })();

            if (!targetComposableToUse.lastSuccessfulData && !targetComposableToUse.isLoading)
                targetComposableToUse.updateData();

            if (targetComposableToUse.error || targetComposableToUse.isLoading || !targetComposableToUse.lastSuccessfulData)
            {
                return {
                    isLoading: targetComposableToUse.isLoading,
                    networthChangeOptionValues: { '30d': 0, '7d': 0 },
                    error: targetComposableToUse.error
                };
            }

            const map = targetComposableToUse.lastSuccessfulData.map;

            const networthNow = parseFloat(map[Object.keys(map).reverse()[0]]);
            const networthAtRequestedEpoch = parseFloat
            (
                Object.keys(map)
                .map(x =>
                {
                    return {
                        timeDelta: Math.abs(parseInt(x) - dateCutoff),
                        value: map[x]
                    }
                })
                .sort((a,b) => (b.timeDelta - a.timeDelta))
                .reverse()[0].value
            );

            const uniformNetworthValue = networthNow - networthAtRequestedEpoch;

            return {
                isLoading: targetComposableToUse.isLoading,
                networthChangeOptionValues: { '30d': uniformNetworthValue, '7d': uniformNetworthValue },
                error: targetComposableToUse.error
            };
        },
        userExpenses()
        {
            if (!this.store.userExpensesIncomes?.lastSuccessfulData) return { '30d': 0, '7d': 0, 'M': 0, 'W': 0 };
            return {
                '30d': parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.expenses30d),
                '7d': parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.expenses7d),
                "M": parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.expensesCurrentMonth),
                "W": parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.expensesCurrentWeek),
            };
        },
        userIncomes()
        {
            if (!this.store.userExpensesIncomes?.lastSuccessfulData) return { '30d': 0, '7d': 0, 'M': 0, 'W': 0 };
            return {
                '30d': parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.incomes30d),
                '7d': parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.incomes7d),
                "M": parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.incomesCurrentMonth),
                "W": parseFloat(this.store.userExpensesIncomes.lastSuccessfulData.incomesCurrentWeek),
            };
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
        getDateAge(epoch: number) { return getDateAge(epoch) },
        viewTxn(id:string)
        {
            router.push({name: 'singleTransaction', params: { id: id }})
        },
        formatDate: formatDate,
        getCurrentMonthStartEpoch: getCurrentMonthStartEpoch,
        getStartOfWeekEpoch: getStartOfWeekEpoch
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
        'expensesPanel incomesPanel networthPanel netChangePanel'
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
        'networthPanel netChangePanel'
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
        'networthPanel'
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