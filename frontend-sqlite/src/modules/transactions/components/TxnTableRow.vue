<template>
    <div class="txnTableRowRoot">
        <div :class="{'selected': isSelected}" class="fullSize"
             @mousedown="event => recordMouseButtonClickType(event)"
             v-on-long-press="
             [
                () => onTxnLongPressed(),
                {
                    onMouseUp: (_, _2, _3) => onClickRelease(),
                    delay: 500
                },
             ]"
             >
             <OverlapArea class="fullSize">
                 <div class="txnTableRowInner">
                     <div class="bodyRowNameGrid">
                         <TxnTooltip :txn="{ ...txn, tagIds: [...txn.tagIds] }"
                                     :open-delay="props.txnTooltipOpenDelay"
                                     :close-delay="props.txnTooltipCloseDelay">
                             <div class="fullSize rel" style="display: flex; align-items: end;">
                                 <div class="fullSize abs ellipsis" style="text-align: start; height:min-content;">
                                     {{ txn.title }}
                                 </div>
                             </div>
                         </TxnTooltip>
                         <div class="xLeft yTop" style="color: #555;">
                             <DateTooltip :date="txn.creationDate">
                                {{ getDateAge(txn.creationDate) }} ago ({{ formatDate(new Date(txn.creationDate), 'YYYY-MM-DD') }})
                            </DateTooltip>
                         </div>
                     </div>
                     <div class="bodyRowFromToGrid">
                         <div class="xLeft yBottom">
                            <div v-if="containerFlowDirection[0] === MULTIPLE" class="grayedOut">(Multiple)</div>
                            <div v-else-if="containerFlowDirection[0] === LOADING" class="grayedOut">(Loading)</div>
                            <div v-else-if="containerFlowDirection[0] === null" class="grayedOut"> - </div>
                            <div v-else> {{ containerFlowDirection[0] }} </div>
                         </div>
                         <div class="xLeft yTop">
                            <div v-if="containerFlowDirection[1] === MULTIPLE" class="grayedOut">(Multiple)</div>
                            <div v-else-if="containerFlowDirection[1] === LOADING" class="grayedOut">(Loading)</div>
                            <div v-else-if="containerFlowDirection[1] === null" class="grayedOut"> - </div>
                            <div v-else> {{ containerFlowDirection[1] }} </div>
                         </div>
                     </div>
                     <div :class="{ [changeToClass(txn.changeInValue)]: true, bodyRowValueChange: true }">
                         {{ parseFloat(txn.changeInValue).toFixed(2) }}
                     </div>
                 </div>
                 <SelectionMark v-if="isSelected" />
             </OverlapArea>
        </div>
    </div>
</template>

<script lang="ts" setup>
import TxnTooltip from './TxnTooltip.vue';
import DateTooltip from '@/modules/core/components/data-display/DateTooltip.vue';
import { vOnLongPress } from '@vueuse/components';
import { formatDate, getDateAge } from '@/modules/core/utils/date';
import { useContainersStore } from '@/modules/containers/stores/useContainersStore';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';
import { computed, ref } from 'vue';
import SelectionMark from '@/modules/core/components/decorations/SelectionMark.vue';
import { useMediaQuery } from '@vueuse/core';

/** A symbol that represents a from / to side contains multiple containers. */
const MULTIPLE: unique symbol = Symbol();
const LOADING: unique symbol = Symbol();

export type TxnTableRowProps =
{
    txn:
    {
        readonly id: string,
        readonly tagIds: readonly string[],
        readonly creationDate: number,
        readonly changeInValue: string,
        readonly title: string,
        readonly description: string,
        readonly owner: string,
        readonly excludedFromIncomesExpenses: boolean,
        readonly fragments: readonly
        {
            readonly fromContainer: string | null,
            readonly toContainer: string | null,
            readonly fromAmount: string | null,
            readonly toAmount: string | null,
            readonly fromCurrency: string | null,
            readonly toCurrency: string | null,
        }[]
    },
    txnTooltipOpenDelay?: number | undefined,
    txnTooltipCloseDelay?: number | undefined,
    isSelected: boolean
};

export type TxnTableRowEmits =
{
    (e: 'onLongPress'): void,
    (e: 'onClick'): void
};

const isLongPressInProgress = ref<boolean>(false);
const isTouchScreen = useMediaQuery(`(pointer: coarse)`);
const lastClickType = ref<'left'|'right'|'middle'|null>(null); // This is needed to track if the press is left click or not.
const emits = defineEmits<TxnTableRowEmits>();
const props = withDefaults(defineProps<TxnTableRowProps>(), { isSelected: false });
const { findContainerById } = useContainersStore();
const containerFlowDirection = computed<[string | null | typeof MULTIPLE | typeof LOADING, string | null | typeof MULTIPLE | typeof LOADING]>(() =>
{
    const fragments = props.txn.fragments;
    const fromContainers = [...new Set<string>(fragments.map(x => x.fromContainer).filter(x => x !== null))];
    const toContainers = [...new Set<string>(fragments.map(x => x.toContainer).filter(x => x !== null))];
    const fromContainerResult = (() =>
    {
        if (fromContainers.length === 0) return null;
        if (fromContainers.length > 1) return MULTIPLE;
        return findContainerById(fromContainers[0])?.name ?? LOADING;
    })();
    const toContainerResult = (() =>
    {
        if (toContainers.length === 0) return null;
        if (toContainers.length > 1) return MULTIPLE;
        return findContainerById(toContainers[0])?.name ?? LOADING;
    })();
    return [fromContainerResult, toContainerResult] as const;
});

function changeToClass(changeInValue: string)
{
    const value = parseFloat(changeInValue);
    if (value > 0) return 'increase';
    else if (value < 0) return 'decrease';
    else return 'noChange';
}

function onClickRelease()
{
    if (!isLongPressInProgress.value && lastClickType.value === 'left' || isTouchScreen.value)
        emits('onClick');
    isLongPressInProgress.value = false;
}

function recordMouseButtonClickType(e: PointerEvent | MouseEvent)
{
    lastClickType.value = eventButtonIdToType(e);
}

function onTxnLongPressed()
{
    isLongPressInProgress.value = true;
    if (lastClickType.value === 'left') emits('onLongPress');
}

function eventButtonIdToType(e: PointerEvent | MouseEvent)
{
    if (e.button === 0) return 'left';
    else if (e.button === 1) return 'middle';
    else if (e.button === 2) return 'right';
    return null;
}
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box; }

.txnTableRowRoot .selected
{
    background: fade(@focus, 10%);
    .txnTableRowInner { opacity: 0.5; }
}

.grayedOut { color: gray; }

.txnTableRowInner
{
    &:hover
    {
        background: @focusDark;
        color: @focus;
    }

    .horiPadding(calc(@desktopPagePadding));
    display: grid;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    height: 100%;
    gap: 14px;
    grid-template-columns: 1fr 130px 85px;
    overflow: hidden;
    border-bottom: 1px dashed @border;

    .bodyRowNameGrid
    {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
    }

    .bodyRowFromToGrid
    {
        font-size: 12px;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
        div:nth-child(1) { align-content: end; }
        div { .ellipsis; text-align: start; }
    }

    .bodyRowValueChange
    {
        font-size: 18px;
        .xRight; .yCenter;
        &.decrease { color: @error; }
        &.increase { color: @success; }
        &.noChange { color: orange; }
    }
}

@mobileCutoffWidth: 650px;
@container transactionsPage (width <= @mobileCutoffWidth)
{
    // Hide the column "from / to"
    .txnTableRowInner { grid-template-columns: 1fr 0px max-content !important; }
    .bodyRowFromToGrid, .headerRowFromTo { display: none; }
    .txnTableRowInner { .horiPadding(@mobilePagePadding) !important; }
}
</style>