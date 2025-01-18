<template>
    <VTooltip class="mainTxnTooltip" :location="'bottom start'" :disabled="isTouchScreen"
              :close-delay="props.closeDelay ?? 500" :open-delay="props.openDelay ?? 500">
        <template v-slot:activator="{ props }">
            <div v-bind="props">
                <slot></slot>
            </div>
        </template>
        <div style="display: grid; grid-template-columns: 1fr; grid-auto-rows: auto; grid-auto-flow: row;">
            {{ isTouchScreen }}
            <div class="dateLabel">Transaction at {{ formatDate(new Date(props.txn.creationDate)) }}</div>
            <div class="ageLabel">{{ dateAge }} ago</div>
            <div class="titleLabel">{{ props.txn.title }}</div>
            <div class="">{{ tagsLabel }}</div>
            <div style="padding-bottom: 14px;"></div>
            <div class="ignoredLabel" v-if="props.txn.excludedFromIncomesExpenses">
                * Excluded from incomes / expenses
            </div>
            <div class="conversionLabel">{{ conversionLabel }}</div>
            <div class="idLabel">{{ props.txn.id }}</div>
        </div>
    </VTooltip>
</template>

<script lang="ts" setup>
import { computed, type DeepReadonly } from 'vue';
import { VTooltip } from 'vuetify/components';
import type { GetTxnAPI } from '../../../../../api-types/txn';
import { formatDate, getDateAgeFull } from '@/modules/core/utils/date';
import { useTxnTagsStore } from '@/modules/txnTypes/stores/useTxnTypesStore';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import { useMediaQuery, useNow } from '@vueuse/core';

export type TxnTooltipProps = { txn: DeepReadonly<GetTxnAPI.TxnDTO>; openDelay?: number; closeDelay?: number; };
const isTouchScreen = useMediaQuery(`(pointer: coarse)`);
const props = defineProps<TxnTooltipProps>();
const txnTagsStore = useTxnTagsStore();
const currenciesStore = useCurrenciesStore();
const now = useNow({interval: 1000});
const dateAge = computed(() => getDateAgeFull(props.txn.creationDate, 'combined', now.value.getTime()));
const findCurrTicker = (currId: string) => currenciesStore.findCurrencyByPubID(currId)?.ticker;
const conversionLabel = computed(() =>
{
    const currToDisplay = 2;
    const t = (cId: string) => findCurrTicker(cId);
    const reducedSpendingMap: { [currId: string]: number } = {};
    const reducedReceivingMap: { [currId: string]: number } = {};

    for (const fragment of props.txn.fragments)
    {
        if (fragment.fromCurrency)
        {
            const fromAmount = parseFloat(fragment.fromAmount!);
            if (!reducedSpendingMap[fragment.fromCurrency]) reducedSpendingMap[fragment.fromCurrency] = fromAmount;
            else reducedSpendingMap[fragment.fromCurrency] += fromAmount;
        }
        if (fragment.toCurrency)
        {
            const toAmount = parseFloat(fragment.toAmount!);
            if (!reducedReceivingMap[fragment.toCurrency]) reducedReceivingMap[fragment.toCurrency] = toAmount;
            else reducedReceivingMap[fragment.toCurrency] += toAmount;
        }
    }

    const spendingCurrencies = Object.keys(reducedSpendingMap);
    const receivingCurrencies = Object.keys(reducedReceivingMap);
    const spendingCurrencyDisplayedDelta = Math.max(0, spendingCurrencies.length - currToDisplay);
    const receivingCurrencyDisplayedDelta = Math.max(0, receivingCurrencies.length - currToDisplay);
    let displayLabel = ``;
    if (spendingCurrencies.length > 0)
    {
        displayLabel += `Spending `;
        displayLabel += Object.entries(reducedSpendingMap)
                        .slice(0, currToDisplay)
                        .map(([currId, amount]) => `${amount} ${t(currId)}`)
                        .join(", ");

        if (spendingCurrencyDisplayedDelta > 0)
            displayLabel += ` (and ${spendingCurrencyDisplayedDelta} more)`;
    }
    if (receivingCurrencies.length > 0)
    {
        if (spendingCurrencies.length > 0) displayLabel += ", \n";
        displayLabel += `Receiving `;
        displayLabel += Object.entries(reducedReceivingMap)
                        .slice(0, currToDisplay)
                        .map(([currId, amount]) => `${amount} ${t(currId)}`)
                        .join(", ");

        if (receivingCurrencyDisplayedDelta > 0)
            displayLabel += ` (and ${receivingCurrencyDisplayedDelta} more)`;
    }

    return displayLabel;
});
const tagsLabel = computed(() =>
{
    const tagsToDisplay = 3;
    const tagsDisplayedDelta = Math.max(0, props.txn.tagIds.length - tagsToDisplay);
    let displayLabel = "";

    displayLabel += props.txn.tagIds
                    .slice(0, tagsToDisplay)
                    .map(tagId => txnTagsStore.tagIdToName(tagId) ?? 'loading...')
                    .join(", ");

    if (tagsDisplayedDelta > 0)
        displayLabel += ` (and ${tagsDisplayedDelta} more)`;

    return displayLabel;
});
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.mainTxnTooltip
{
    & > *
    {
        background: @backgroundDark !important;
        border: 1px solid @border;
        box-shadow: 0px 0px 5px #000;
        color: white;
        pointer-events: all;
    }

    * .epochLabel
    {
        font-family: Consolas;
        color: gray;
    }

    * .titleLabel { font-size: 16px; }

    * .dateLabel, .ageLabel { color: gray; }

    * .idLabel
    {
        color: gray;
        font-family: Consolas;
    }

    * .ignoredLabel
    {
        color: @error;
    }

    * .conversionLabel
    {
        word-wrap: normal;
        white-space: pre-wrap;
    }
}
</style>