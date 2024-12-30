<template>

    <div id="transactionsTopDiv">
        <div id="transactionsTopDivInner">

            <div id="titleArea">
                <ViewTitle :title="'Transactions'" />
            </div>

            <div id="stickyPanel">
                <div id="searchArea">
                    <textarea placeholder="Search for transactions..."
                              class="searchTextarea"
                              rows="1"
                              spellcheck="false"
                              v-model="searchText"
                              :style="isJSONQueryMode ? {'font-family': 'Consolas'} : {}"
                              @change="onSearchTextChange"/>
                        <button :class="{'active': isJSONQueryMode}" @click="isJSONQueryMode = !isJSONQueryMode" class="toggle">
                        <GaIcon icon="regular_expression"></GaIcon>
                    </button>
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
                        <div :class="{'selected': selectedTxnIds.has(item.id), 'bodyRows': true}"
                             v-for="item in mainPagination.lastCallResult.value.rangeItems"
                             :key="item.id"
                             v-on-long-press="[
                                () => onTxnLongPressed(item.id),
                                { onMouseUp: (_, _2, longPress) => onTxnClicked(longPress, item.id), delay: 500 },
                             ]">
                                <OverlapArea>
                                    <div class="bodyRowsInner">
                                        <div class="bodyRowNameGrid">
                                            <TxnTooltip :txn="{ ...item, tagIds: [...item.tagIds] }"
                                                        :open-delay="hasSelectedTxns ? 1500 : 500">
                                                <div class="fullSize rel" style="display: flex; align-items: end;">
                                                    <div class="fullSize abs ellipsis" style="text-align: start; height:min-content;">
                                                        {{ item.title }}
                                                    </div>
                                                </div>
                                            </TxnTooltip>
                                            <div class="xLeft yTop" style="color: #555;">
                                                <DateTooltip :date="item.creationDate">{{ getDateAge(item.creationDate) }} ago</DateTooltip>
                                            </div>
                                        </div>
                                        <div class="bodyRowFromToGrid">
                                            <div class="xLeft yBottom">{{ item.fromContainer ? findContainerById(item.fromContainer)?.name : '-' }}</div>
                                            <div class="xLeft yTop">{{ item.toContainer ? findContainerById(item.toContainer)?.name : '-' }}</div>
                                        </div>
                                        <div :class="{ [changeToClass(item.changeInValue)]: true, bodyRowValueChange: true }">
                                            {{ parseFloat(item.changeInValue).toFixed(2) }}
                                        </div>
                                    </div>
                                    <div v-if="selectedTxnIds.has(item.id)" class="fullSize center" style="pointer-events: none;">
                                        <GaIcon class="selectionCheckmark" icon="check"/>
                                    </div>
                                </OverlapArea>
                        </div>
                    </div>
                    <div id="statusPanel">
                        <div v-if="mainPagination.isLoading.value || fetchError">
                            <NetworkCircularIndicator id="loadingIndicator" :isLoading="mainPagination.isLoading.value"/>
                            <StaticNotice type="ERR" v-if="fetchError">
                                <br />
                                <div style="white-space: break-spaces;">{{ fetchError }}</div>
                            </StaticNotice>
                        </div>
                    </div>
                </OverlapArea>
            </div>

            <div id="pageAndOptionsPanel">
                <div id="selectionPanel" :class="{'expanded': hasSelectedTxns}">
                    <div class="xLeft yCenter">
                        {{ selectedTxnIds.size }} txn(s) selected
                    </div>
                    <div class="xRight yCenter">
                        <VTooltip class="themedTooltip">
                            <template v-slot:activator="{ props }">
                                <div v-bind="props">
                                    <BaseButton @click="selectedTxnIds.clear()">
                                        <GaIcon icon="deselect" style="font-size: 20px" />
                                    </BaseButton>
                                </div>
                            </template>
                            <div>Unselect all selected txns</div>
                        </VTooltip>
                    </div>
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
    </div>
</template>

<script lang="ts" setup>
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import { API_TRANSACTIONS_JSON_QUERY_PATH, API_TRANSACTIONS_PATH } from "@/apiPaths";
import useNetworkPaginationNew, { type UpdaterReturnType } from "@/modules/core/composables/useNetworkedPagination";
import { useMainStore } from "@/modules/core/stores/store";
import { isNullOrUndefined } from "@/modules/core/utils/equals";
import { buildSearchParams } from "@/modules/core/utils/urlParams";
import router, { ROUTER_NAME_CREATE_NEW_TXN, ROUTER_NAME_SINGLE_TXN } from "@/router";
import { computed, onMounted, ref } from 'vue';
import { type GetTxnAPI, type GetTxnJsonQueryAPI } from '../../../../../api-types/txn';
import { useContainersStore } from '../../containers/stores/useContainersStore';
import NumberPagination from '@/modules/core/components/data-display/NumberPagination.vue';
import { getDateAge } from '@/modules/core/utils/date';
import DateTooltip from '@/modules/core/components/data-display/DateTooltip.vue';
import TxnTooltip from '../components/TxnTooltip.vue';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import axios from 'axios';
import StaticNotice from '@/modules/core/components/data-display/StaticNotice.vue';
import GaIcon from '@/modules/core/components/decorations/GaIcon.vue';
import { vOnLongPress } from '@vueuse/components';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';
import { VTooltip } from 'vuetify/components';

const itemsInPage = 50;
const { authGet, updateAll: mainStoreUpdateAll } = useMainStore();
const { findContainerById } = useContainersStore();
const [isJSONQueryMode, searchText, currentPageIndex] = [ref(false), ref(""), ref(0)];
const selectedTxnIds = ref<Set<string>>(new Set());
const fetchError = ref<any>(null);
const uiRangeText = computed(() =>
{
    if (isNullOrUndefined(mainPagination.lastCallResult?.value)) return "Loading...";
    const start = mainPagination.viewportStartIndex.value + 1;
    const end = Math.min(mainPagination.lastCallResult.value.totalItems, mainPagination.viewportEndIndex.value + 1);
    const totalItems = mainPagination.lastCallResult.value.totalItems;
    if (start === end || totalItems === 0) return "No Results";
    return `Showing ${start} - ${end} of ${totalItems}`;
});

const mainPagination = useNetworkPaginationNew<GetTxnAPI.TxnDTO>(
{
    updater: async (start:number, end:number): Promise<UpdaterReturnType<GetTxnAPI.TxnDTO>> =>
    {
        const sendQuery = async (url:string) => await authGet(url);

        try
        {
            fetchError.value = null;
            if (isJSONQueryMode.value)
            {
                const queryString = buildSearchParams(
                {
                    endIndex: `${end}`,
                    startIndex: `${start}`,
                    query: searchText.value
                } satisfies GetTxnJsonQueryAPI.QueryDTO, { ignoreKey: "ALL" });

                const response = await sendQuery(`${API_TRANSACTIONS_JSON_QUERY_PATH}?${queryString}`);
                const responseJSON = response.data;

                return {
                    totalItems: responseJSON.totalItems,
                    startingIndex: responseJSON.startingIndex,
                    endingIndex: responseJSON.endingIndex,
                    rangeItems: responseJSON.rangeItems
                };
            }
            else
            {
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
            }
        }
        catch(e: unknown)
        {
            if (axios.isAxiosError(e))
            {
                if (e.status === 400)
                    fetchError.value = `${e.response?.data['msg']}\nPlease check if your query is correct.`;
            }
            else fetchError.value = "Something went wrong.";

            return {
                endingIndex: 0,
                rangeItems: [],
                startingIndex: 0,
                totalItems: 0
            }
        }
    },
    pageIndex: currentPageIndex,
    pageSize: ref(itemsInPage),
    overflowResolutionHandler: (_, lastAvailablePageIndex) => currentPageIndex.value = lastAvailablePageIndex,
    updateOnMount: true
});

const hasSelectedTxns = computed(() => selectedTxnIds.value.size > 0);

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

function changeToClass(changeInValue: string)
{
    const value = parseFloat(changeInValue);
    if (value > 0) return 'increase';
    else if (value < 0) return 'decrease';
    else return 'noChange';
};

function onTxnClicked(isLongPress: boolean, txnId: string)
{
    if (isLongPress) return;
    if (!hasSelectedTxns.value) return redirect(['VIEW_TXN', txnId])
    toggleTxnSelection(txnId);
}

function onTxnLongPressed(txnId: string)
{
    toggleTxnSelection(txnId);
}

function toggleTxnSelection(txnId: string)
{
    if (selectedTxnIds.value.has(txnId)) selectedTxnIds.value.delete(txnId);
    else selectedTxnIds.value.add(txnId);
}

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
            z-index: 999;

            #searchArea
            {
                .tight;
                overflow: scroll;
                border-top: 1px solid @border;
                border-bottom: 1px solid @border;
                padding: 15px;
                padding-left: @desktopPagePadding;
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 14px;

                .searchTextarea
                {
                    .tight;
                    .fullSize;
                    appearance: none;
                    outline: none;
                }
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

            .bodyRows.selected
            {
                background: fade(@focus, 10%);
                .bodyRowsInner { opacity: 0.5; }
            }

            .bodyRowsInner
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
                gap: 14px;
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

        #pageAndOptionsPanel
        {
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            position: absolute;
            bottom: 0px;
            left: 0px;
            right: 0px;
            background: @backgroundDark;
            box-shadow: 0px 0px 5px black;
            border-top: 1px solid @border;
            padding: 14px;
            .horiPadding(@desktopPagePadding);

            & > div
            {
                .leftRightGrid(1fr, auto);
                color: @foreground;
                gap: 14px;
                white-space: nowrap;
            }

            #selectionPanel
            {
                color: @focus;
                overflow-y: hidden;
                transition: all 0.5s ease;
                max-height: 0px;
                opacity: 0;
                &.expanded
                {
                    max-height: 100px;
                    padding-bottom: 24px;
                    opacity: 1;
                }
            }

            #paginationPanel div:nth-child(1) { .ellipsis; text-align: start; }
        }
    }
}

.toggle
{
    border: 1px solid @border;
    width: fit-content;
    padding: 4px;
    border-radius: 4px;
    &.active { background: fade(@focus, 50%); color: white; border: 1px solid @focus; }
    &:hover { background: @focusDark; }
}

.selectionCheckmark
{
    font-size: 24px;
    background: @focusDark;
    border-radius: 100%;
    color: @focus;
    padding: 4px;
}

@container transactionsPage (width <= @mobileCutoffWidth)
{
    // Hide the column "from / to"
    .bodyRowsInner { grid-template-columns: 1fr 0px max-content !important; }
    .headerRow { grid-template-columns: 1fr max-content !important; }
    .bodyRowFromToGrid, .headerRowFromTo { display: none; }
    .bodyRowsInner { .horiPadding(@mobilePagePadding) !important; }
    #pageAndOptionsPanel { .horiPadding(@mobilePagePadding) !important; }
    #titleArea { padding: @mobilePagePadding !important; }
    #searchArea { padding-left: @mobilePagePadding !important; }
    .headerRow { .horiPadding(@mobilePagePadding) !important; }
}
</style>