<template>

    <div id="transactionsTopDiv">
        <div id="transactionsTopDivInner">
            <div id="titleArea">
                <div class="leftRightGridLMax">
                    <ViewTitle :title="'Transactions'" />
                    <div class="yCenter xRight">
                        <BaseButton icon="add_circle" @click="redirect(['ADD_TXN'])">Add Transaction</BaseButton>
                    </div>
                </div>
            </div>

            <div id="searchArea">
                <input placeholder="Search for transactions..."
                       v-model="searchText"
                       @change="onSearchTextChange"/>
            </div>

            <div id="contentArea">
                <OverlapArea class="fullSize">
                    <CustomTable v-if="mainPagination.lastCallResult.value && mainPagination.lastCallResult.value.rangeItems?.length != 0"
                                 class="allTransactionsTable" rows="50px auto" columns="1fr" rowRows="1fr"
                                 :style="{ opacity: mainPagination.isLoading.value ? 0.3 : 1 }"
                                 rowColumns="1fr 100px 85px" rowAreas="'name fromTo valueChange'" bodyRows="min-content">
                        <template #header>
                            <CustomTableRow class="headerRow fullSize" style="font-weight: bold;">
                                <CustomTableCell grid-area="name" class="yCenter xLeft headerRowName">Name</CustomTableCell>
                                <CustomTableCell grid-area="fromTo" class="yCenter xLeft headerRowFromTo">From - To</CustomTableCell>
                                <CustomTableCell grid-area="valueChange" class="yCenter xRight headerRowValueChange">Δ Value</CustomTableCell>
                            </CustomTableRow>
                        </template>
                        <template #bodyOuter>
                            <div style="overflow-y: scroll;">
                                <CustomTableRow v-for="item in mainPagination.lastCallResult.value.rangeItems" class="bodyRows"
                                                @click="redirect(['VIEW_TXN', item.id])">
                                    <CustomTableCell grid-area="name" class="bodyRowNameGrid">
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
                                    </CustomTableCell>
                                    <CustomTableCell grid-area="fromTo" class="bodyRowFromToGrid">
                                        <div class="xLeft yBottom">
                                            <template v-if="item.fromContainer">{{ findContainerById(item.fromContainer)?.name }}</template>
                                            <template v-else>-</template>
                                        </div>
                                        <div class="xLeft yTop">
                                            <template v-if="item.toContainer">{{ findContainerById(item.toContainer)?.name }}</template>
                                            <template v-else>-</template>
                                        </div>
                                    </CustomTableCell>
                                    <CustomTableCell grid-area="valueChange" class="bodyRowValueChange"
                                                     :class="{ [changeToClass(item.changeInValue)]: true }">
                                        {{ parseFloat(item.changeInValue).toFixed(2) }}
                                    </CustomTableCell>
                                </CustomTableRow>
                            </div>
                        </template>
                    </CustomTable>
                    <div v-else class="noTxnFoundNotice" :style="{ opacity: mainPagination.isLoading.value ? 0.3 : 1 }">
                        No Transactions Found
                    </div>
                    <NetworkCircularIndicator v-if="mainPagination.isLoading.value" :isLoading="mainPagination.isLoading.value" />
                </OverlapArea>
            </div>

            <div id="paginationArea">
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
* { box-sizing: border-box; overflow: hidden; }
@mobileCutoffWidth: 650px;

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
        display: grid;
        grid-template:
            "title" auto
            "search" auto
            "content" 1fr
            "pagination" auto
            / 1fr;

        #titleArea
        {
            padding: @desktopPagePadding;
            grid-area: title;
        }

        #searchArea
        {
            border-top: 1px solid @border;
            border-bottom: 1px solid @border;
            padding: 15px;
            padding-left: @desktopPagePadding;
            grid-area: search;
            input { .fullSize; appearance: none; outline: none; }
        }

        #contentArea
        {
            .fullSize;
            grid-area: content;

            .headerRow, .bodyRows { border-bottom: 1px solid @border; }

            .bodyRows
            {
                &:hover
                {
                    background: @focusDark;
                    color: @focus;
                }

                .horiPadding(calc(@desktopPagePadding));
                cursor: pointer;
                user-select: none;
                white-space: nowrap;
                height: 60px;
                grid-template-columns: 1fr 130px 85px;
                overflow: hidden;
            }

            .headerRow
            {
                .horiPadding(@desktopPagePadding);
                grid-template-columns: 1fr 130px 85px;
                overflow: hidden;
                box-shadow: 0px 0px 5px black;
            }

            .noTxnFoundNotice
            {
                .center;
                color: @foreground;
            }

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

        #paginationArea
        {
            box-shadow: 0px 0px 5px black;
            border-top: 1px solid @border;
            padding: 14px;
            .horiPadding(@desktopPagePadding);
            color: @foreground;
            grid-area: pagination;
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
    .bodyRows, .headerRow { grid-template-columns: 1fr 0px 85px !important; }
    .bodyRowFromToGrid, .headerRowFromTo { display: none; }
    .bodyRows { .horiPadding(@mobilePagePadding) !important; }
    #paginationArea { .horiPadding(@mobilePagePadding) !important; }
    #titleArea { padding: @mobilePagePadding !important; }
    #searchArea { padding-left: @mobilePagePadding !important; }
    .headerRow { .horiPadding(@mobilePagePadding) !important; }
}
</style>