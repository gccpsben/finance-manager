<template>
    <div class="listCellTxnRowRoot">
        <TxnTooltip :txn="props.txn">
            <GridShortcut columns="50px 1fr 1fr" :class="{'fullSize': true, 'ignored': txn.excludedFromIncomesExpenses}" @click="viewTxn(props.txn.id)" 
                          class="fullSize highlightableRow">
                <div class="listItemTitle middleLeft">{{ getDateAge(props.txn.creationDate) }}</div>
                <div class="listItemTitle middleLeft">
                    <div class="ellipsis">{{ props.txn.title }}</div>
                </div>
                <div class="listItemTitle middleRight">
                    {{ props.txn.changeInValue }} {{ currenciesStore.getBaseCurrencySymbol() }}
                </div>
            </GridShortcut>
        </TxnTooltip>
    </div>
</template>

<script setup lang="ts">
import type { DeepReadonly } from 'vue';
import type { GetTxnAPI } from '../../../../../api-types/txn';
import router from '@/router';
import { getDateAge } from '@/modules/core/utils/date';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import TxnTooltip from './TxnTooltip.vue';
import GridShortcut from '@/modules/core/components/layout/GridShortcut.vue';

export type ListCellTxnRowProps = { txn: DeepReadonly<GetTxnAPI.TxnDTO>; };
const props = defineProps<ListCellTxnRowProps>();
const currenciesStore = useCurrenciesStore();

function viewTxn(id:string)
{
    router.push(
    {
        name: 'singleTransaction',
        params: { id: id }
    })
}
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