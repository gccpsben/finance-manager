<template>

    <div id="transactionsTopDiv">
        <div id="transactionsTopDivInner">

            <div id="titleArea">
                <ViewTitle :title="'Transactions'" />
            </div>

            <div id="stickyPanel">
                <div id="searchArea">
                    <input placeholder="Search for transactions..."
                        v-model="searchText"
                        @change="onSearchTextChange"/>
                </div>

                <div id="tableHeader" class="headerRow fullSize" style="font-weight: bold;">
                    <div grid-area="name" class="yCenter xLeft headerRowName">Name</div>
                    <div grid-area="fromTo" class="yCenter xLeft headerRowFromTo">From - To</div>
                    <div grid-area="valueChange" class="yCenter xRight headerRowValueChange">Δ Value</div>
                </div>
            </div>

            <div id="contentPanel">
                <OverlapArea>
                    <div v-if="mainPagination.lastCallResult.value && mainPagination.lastCallResult.value.rangeItems?.length != 0">
                        <div class="bodyRows" v-for="item in mainPagination.lastCallResult.value.rangeItems" @click="redirect(['VIEW_TXN', item.id])">
                            <div class="bodyRowNameGrid">
                                <div class="xLeft yBottom">
                                    <div class="ellipsis">
                                        <TxnTooltip :txn="{ ...item, tagIds: [...item.tagIds] }">
                                            {{ item.title }}
                                        </TxnTooltip>
                                    </div>
                                </div>
                                <div class="xLeft yTop" style="color: #555;">
                                    <DateTooltip :date="item.creationDate">{{ getDateAge(item.creationDate) }} ago</DateTooltip>
                                </div>
                            </div>
                            <div class="bodyRowFromToGrid">
                                <div class="xLeft yBottom">
                                    <template v-if="item.fromContainer">{{ findContainerById(item.fromContainer)?.name }}</template>
                                    <template v-else>-</template>
                                </div>
                                <div class="xLeft yTop">
                                    <template v-if="item.toContainer">{{ findContainerById(item.toContainer)?.name }}</template>
                                    <template v-else>-</template>
                                </div>
                            </div>
                            <div class="bodyRowValueChange" :class="{ [changeToClass(item.changeInValue)]: true }">
                                {{ parseFloat(item.changeInValue).toFixed(2) }}
                            </div>
                        </div>
                    </div>
                    <div id="statusPanel">
                        <div>
                            <NetworkCircularIndicator id="loadingIndicator" v-if="mainPagination.isLoading.value" :isLoading="mainPagination.isLoading.value" />
                        </div>
                    </div>
                </OverlapArea>
            </div>

            <div id="paginationPanel">
                <div class="xLeft yCenter">{{ uiRangeText }}</div>
                <div class="xRight yCenter">
                    <NumberPagination :max-page-readable="mainPagination.lastCallMaxPageIndex.value + 1"
                                      v-model:model-value="mainPagination.currentPage.value" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import {API_TRANSACTIONS_PATH } from "@/apiPaths";
import useNetworkPaginationNew, { type UpdaterReturnType } from "@/modules/core/composables/useNetworkedPagination";
import { useMainStore } from "@/modules/core/stores/store";
import { isNullOrUndefined } from "@/modules/core/utils/equals";
import { buildSearchParams } from "@/modules/core/utils/urlParams";
import router, { ROUTER_NAME_CREATE_NEW_TXN, ROUTER_NAME_SINGLE_TXN } from "@/router";
import { computed, onMounted, ref } from 'vue';
import { type GetTxnAPI } from '../../../../../api-types/txn';
import { useContainersStore } from '../../containers/stores/useContainersStore';
import NumberPagination from '@/modules/core/components/data-display/NumberPagination.vue';
import { getDateAge } from '@/modules/core/utils/date';
import DateTooltip from '@/modules/core/components/data-display/DateTooltip.vue';
import TxnTooltip from '../components/TxnTooltip.vue';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';
import CustomTableRow from '@/modules/core/components/tables/CustomTableRow.vue';
import CustomTableCell from '@/modules/core/components/tables/CustomTableCell.vue';
import CustomTable from '@/modules/core/components/tables/CustomTable.vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';

const { authGet, updateAll: mainStoreUpdateAll } = useMainStore();
const { findContainerById } = useContainersStore();

const currentPageIndex = ref(0);
const itemsInPage = 50;
const searchText = ref("");
const mainPagination = useNetworkPaginationNew<GetTxnAPI.TxnDTO>(
{
    updater: async (start:number, end:number): Promise<UpdaterReturnType<GetTxnAPI.TxnDTO>> =>
    {
        const sendQuery = async (url:string) => await authGet(url);

        const queryString = buildSearchParams(
        {
            start: `${start}`, end: `${end}`,
            title: !!searchText.value ? searchText.value : undefined
        }, { ignoreKey: "ALL" });

        const responseJSON = (await sendQuery(`${API_TRANSACTIONS_PATH}?${queryString}`)).data;

        return {
            totalItems: responseJSON.totalItems,
            startingIndex: responseJSON.startingIndex,
            endingIndex: responseJSON.endingIndex,
            rangeItems: responseJSON.rangeItems
        };
    },
    pageIndex: currentPageIndex,
    pageSize: ref(itemsInPage),
    overflowResolutionHandler: (_, lastAvailablePageIndex) => currentPageIndex.value = lastAvailablePageIndex,
    updateOnMount: true
});
const uiRangeText = computed(() =>
{
    if (isNullOrUndefined(mainPagination.lastCallResult?.value)) return "Loading...";
    const start = mainPagination.viewportStartIndex.value + 1;
    const end = Math.min(mainPagination.lastCallResult.value.totalItems, mainPagination.viewportEndIndex.value + 1);
    const totalItems = mainPagination.lastCallResult.value.totalItems;
    if (start === end || totalItems === 0) return "No Results";
    return `Showing ${start} - ${end} of ${totalItems}`;
});

function onSearchTextChange()
{
    mainPagination.update();
    currentPageIndex.value = 0;
}

function redirect(target: ["VIEW_TXN", string] | ["ADD_TXN"])
{
    if (target[0] === 'ADD_TXN') router.push( { name: ROUTER_NAME_CREATE_NEW_TXN });
    else router.push({ name: ROUTER_NAME_SINGLE_TXN, params: { id: target[1] } });
}

const changeToClass = (changeInValue: string) =>
{
    const value = parseFloat(changeInValue);
    if (value > 0) return 'increase';
    else if (value < 0) return 'decrease';
    else return 'noChange';
};
onMounted(async () => await mainStoreUpdateAll());
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box; }
@mobileCutoffWidth: 650px;
@bodyRowHeight: 60px;

#transactionsTopDiv
{
    container-name: transactionsPage;
    container-type: size;

    overflow-x:hidden;
    .fullSize;
    font-family: @font;

    #transactionsTopDivInner
    {
        .fullSize;
        overflow: auto;
        color: @foreground;

        #titleArea
        {
            padding: @desktopPagePadding;
        }

        #stickyPanel
        {
            position: sticky; top: 0px;
            background: @backgroundDark;

            #searchArea
            {
                overflow: visible;
                border-top: 1px solid @border;
                border-bottom: 1px solid @border;
                padding: 15px;
                padding-left: @desktopPagePadding;
                input { .fullSize; appearance: none; outline: none; }
            }

            #tableHeader
            {
                .horiPadding(@desktopPagePadding);
                overflow: hidden;
                box-shadow: 0px 4px 5px -4px black;
                border-bottom: 1px solid @border;
                height: min-content;
                .vertPadding(15px);
                display: grid;
                grid-template-columns: 1fr 130px 85px;
            }
        }

        #contentPanel
        {
            padding-bottom: @bodyRowHeight;

            .bodyRows
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
                height: @bodyRowHeight;
                grid-template-columns: 1fr 130px 85px;
                overflow: hidden;

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

            #statusPanel
            {
                position: absolute; top:0px; .fullSize;
                .center;
                pointer-events: none;

                & > * { pointer-events: all; }
            }
        }

        #paginationPanel
        {
            position: absolute;
            bottom: 0px;
            left: 0px;
            right: 0px;
            background: @backgroundDark;
            box-shadow: 0px 0px 5px black;
            border-top: 1px solid @border;
            padding: 14px;
            color: @foreground;
            .horiPadding(@desktopPagePadding);
            .leftRightGrid(1fr, auto);
            gap: 14px;
            white-space: nowrap;
            div:nth-child(1) { .ellipsis; text-align: start; }
        }
    }
}

@container transactionsPage (width <= @mobileCutoffWidth)
{
    // Hide the column "from / to"
    .bodyRows { grid-template-columns: 1fr 0px max-content !important; }
    .headerRow { grid-template-columns: 1fr max-content !important; }
    .bodyRowFromToGrid, .headerRowFromTo { display: none; }
    .bodyRows { .horiPadding(@mobilePagePadding) !important; }
    #paginationPanel { .horiPadding(@mobilePagePadding) !important; }
    #titleArea { padding: @mobilePagePadding !important; }
    #searchArea { padding-left: @mobilePagePadding !important; }
    .headerRow { .horiPadding(@mobilePagePadding) !important; }
}
</style>