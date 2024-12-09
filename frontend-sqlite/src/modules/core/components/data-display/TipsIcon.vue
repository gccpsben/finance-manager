<template>
    <VTooltip class="mainTxnTooltip" :location="'bottom start'"
              open-on-click :close-delay="500" :open-delay="500">
        <template v-slot:activator="{ props }">
            <div v-bind="props">
                <GaIcon id="icon" icon="help" style="font-size: 18px; cursor: pointer; user-select: none;"></GaIcon>
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
import { useTxnTagsStore } from '@/modules/txnTypes/stores/useTxnTypesStore';
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
        background: @backgroundDark !important;
        border: 1px solid @border !important;
        box-shadow: 0px 0px 5px #000;
        color: white;
        pointer-events: all;
    }
}
</style>