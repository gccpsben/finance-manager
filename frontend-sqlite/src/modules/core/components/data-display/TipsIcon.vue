<template>
    <VTooltip class="mainTxnTooltip" :location="'bottom start'" :close-delay="500" :open-delay="500">
        <template v-slot:activator="{ props }">
            <div v-bind="props">
                <GaIcon icon="help" style="font-size: 18px;"></GaIcon>
            </div>
        </template>
        <slot></slot>
    </VTooltip>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { VTooltip } from 'vuetify/components';
// import type { GetTxnAPI } from '../../../../../api-types/txn';
import { formatDate, getDateAgeFull } from '@/modules/core/utils/date';
import { useTxnTypesStore } from '@/modules/txnTypes/stores/useTxnTypesStore';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import { useNow } from '@vueuse/core';
import GaIcon from '../decorations/GaIcon.vue';


// export type TxnTooltipProps = { txn: GetTxnAPI.TxnDTO; };
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.mainTxnTooltip
{
    & > *
    {
        background: @surface !important;
        color: white;
        box-shadow: 0px 0px 5px gray;
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