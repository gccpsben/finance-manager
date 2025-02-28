<template>
    <div class="listCellTxnRowRoot">
        <RouterLink class="allUnset" :to="{name: ROUTER_NAME_SINGLE_TXN, params: { 'id': props.txn.id }}">
            <TxnTooltip :txn="props.txn">
                <GridShortcut columns="50px 1fr 1fr" :class="{'ignored': txn.excludedFromIncomesExpenses}" class="fullSize highlightableRow">
                    <div class="listItemTitle middleLeft">{{ getDateAge(props.txn.creationDate) }}</div>
                    <div class="listItemTitle middleLeft">
                        <div class="ellipsis">{{ props.txn.title }}</div>
                    </div>
                    <div class="listItemTitle middleRight">
                        {{ props.txn.changeInValue }} {{ currenciesStore.getBaseCurrencySymbol() }}
                    </div>
                </GridShortcut>
            </TxnTooltip>
        </RouterLink>
    </div>
</template>

<script setup lang="ts">
import type { DeepReadonly } from 'vue';
import type { GetTxnAPI } from '../../../../../api-types/txn';
import router, { ROUTER_NAME_SINGLE_TXN } from '@/router';
import { getDateAge } from '@/modules/core/utils/date';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import TxnTooltip from './TxnTooltip.vue';
import GridShortcut from '@/modules/core/components/layout/GridShortcut.vue';
import { RouterLink } from 'vue-router';

export type ListCellTxnRowProps = { txn: DeepReadonly<GetTxnAPI.TxnDTO>; };
const props = defineProps<ListCellTxnRowProps>();
const currenciesStore = useCurrenciesStore();
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.listCellTxnRowRoot
{
    & :deep(.listItemTitle)
    {
        .fg(inherit); overflow:hidden; white-space: nowrap; text-overflow: ellipsis;
    }

    & :deep(.highlightableRow)
    {
        cursor:pointer;
        &.ignored { opacity: 0.5; }
        &:hover { color: @focus !important; }
    }
}
</style>