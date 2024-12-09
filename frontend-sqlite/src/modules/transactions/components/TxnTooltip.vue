<template>
    <VTooltip class="mainTxnTooltip" :location="'bottom start'" :close-delay="500" :open-delay="500">
        <template v-slot:activator="{ props }">
            <div v-bind="props">
                <slot></slot>
            </div>
        </template>
        <div style="display: grid; grid-template-columns: 1fr; grid-auto-rows: auto; grid-auto-flow: row;">
            <div class="dateLabel">Transaction at {{ formatDate(new Date(props.txn.creationDate)) }}</div>
            <div class="ageLabel">{{ dateAge }} ago</div>
            <div class="titleLabel">{{ props.txn.title }}</div>
            <div class="">{{ txnType?.name }}</div>
            <div style="padding-bottom: 14px;"></div>
            <div class="conversionLabel">{{ conversionLabel }}</div>
            <div class="idLabel">{{ props.txn.id }}</div>
        </div>
    </VTooltip>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { VTooltip } from 'vuetify/components';
import type { GetTxnAPI } from '../../../../../api-types/txn';
import { formatDate, getDateAgeFull } from '@/modules/core/utils/date';
import { useTxnTagsStore } from '@/modules/txnTypes/stores/useTxnTypesStore';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import { useNow } from '@vueuse/core';


export type TxnTooltipProps = { txn: GetTxnAPI.TxnDTO; };
const props = defineProps<TxnTooltipProps>();
const txnTypesStore = useTxnTagsStore();
const currenciesStore = useCurrenciesStore();
const now = useNow({interval: 1000});
const dateAge = computed(() => getDateAgeFull(props.txn.creationDate, 'combined', now.value.getTime()));
const txnType = computed(() => txnTypesStore.txnTags.lastSuccessfulData?.rangeItems.find(x => x.id === props.txn.txnTag));
const findCurrTicker = (currId: string) => currenciesStore.findCurrencyByPubID(currId)?.ticker;
const conversionLabel = computed(() =>
{
    const t = (cId: string) => findCurrTicker(cId);
    if (props.txn.fromCurrency && props.txn.toCurrency)
        return `From ${props.txn.fromAmount} ${t(props.txn.fromCurrency)} to ${props.txn.toAmount} ${t(props.txn.toCurrency)}`
    if (!props.txn.fromCurrency && props.txn.toCurrency)
        return `Earning ${props.txn.toAmount} ${t(props.txn.toCurrency)}`

    return `Spending ${props.txn.fromAmount} ${t(props.txn.fromCurrency!)}`
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
}
</style>