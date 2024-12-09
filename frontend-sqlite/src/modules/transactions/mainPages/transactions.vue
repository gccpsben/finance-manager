<template>

    <div class="topDivTxn">

        <ViewTitle :title="'Transactions'"/>
        <br /><br />

        <div>

            <div id="mainCell">

                <div v-basic="'#panel.gridBase.tight'">
                    <div class="pageSelector">
                        <div class="xLeft yCenter">
                            <FaIcon class="optionIcon" icon="fa-solid fa-rotate" />
                            <input v-basic="'#searchInput.fullHeight.minTextarea'"
                                   type="text"
                                   placeholder="Search for name..."
                                   v-model="searchText"
                                   @change="onSearchTextChange">
                        </div>
                        <div class="xRight">
                            <div v-basic="'#summaryContainer.yCenter'">
                                <h2 class="uiRangeText">{{ uiRangeText }}</h2>
                            </div>
                            <div class="center">
                                <NumberPagination id="tablePagination"
                                                  v-model="currentPageIndex"
                                                  :min-page-readable="1"
                                                  :max-page-readable="mainPagination.lastCallMaxPageIndex.value + 1" />
                            </div>
                        </div>
                    </div>
                    <div class="rel">
                        <div class="fullSize abs" :class="{'darkened': mainPagination.isLoading.value}"
                        style="display:grid; grid-template-rows: repeat(15,1fr);">
                            <div class="row tight" style="font-size:14px;" @click="viewTransaction(item?.id)"
                                 v-for="item in mainPagination.lastCallResult.value?.rangeItems ?? []">
                                <div v-area.class="'checkbox'">
                                    <div class="checkbox">
                                        <input type="checkbox"/>
                                    </div>
                                </div>
                                <div v-area.class="'txnName'">
                                    <TxnTooltip :txn="item">
                                        {{ item?.title }}
                                    </TxnTooltip>
                                </div>
                                <div v-area.class="'txnAge'" class="tight yCenter ellipsisContainer">
                                    <DateTooltip :date="item.creationDate" v-if="item.creationDate">
                                        {{ getDateAge(item?.creationDate) }} ago
                                    </DateTooltip>
                                </div>
                                <div v-area.class="'txnTag'" class="tight yCenter ellipsisContainer">
                                    <div>
                                        {{ getTxnTypeNameById(item?.txnTag, txnTypes.lastSuccessfulData?.rangeItems ?? []) }}
                                    </div>
                                </div>
                                <div v-area.class="'txnFrom'" class="xRight">
                                    <div v-if="item?.fromContainer">
                                        {{ getContainerNameById(item?.fromContainer, containers.lastSuccessfulData?.rangeItems ?? []) }}
                                    </div>
                                </div>
                                <div v-area.class="'arrowIcon'" class="center">
                                    <fa-icon icon="fa-solid fa-arrow-right" />
                                </div>
                                <div v-area.class="'txnTo'" class="xLeft">
                                    <div v-if="item?.toContainer">
                                        {{ getContainerNameById(item?.toContainer, containers.lastSuccessfulData?.rangeItems ?? []) }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import {API_TRANSACTIONS_PATH } from "@/apiPaths";
import { getContainerNameById } from '@/modules/containers/utils/containers';
import useNetworkPaginationNew, { type UpdaterReturnType } from "@/modules/core/composables/useNetworkedPagination";
import vArea from "@/modules/core/directives/vArea";
import { useMainStore } from "@/modules/core/stores/store";
import { isNullOrUndefined } from "@/modules/core/utils/equals";
import { buildSearchParams } from "@/modules/core/utils/urlParams";
import { getTxnTypeNameById } from '@/modules/txnTypes/utils/transactionTypes';
import router from "@/router";
import { computed, onMounted, ref } from 'vue';
import { type GetTxnAPI } from '../../../../../api-types/txn';
import { useContainersStore } from '../../containers/stores/useContainersStore';
import { useTxnTagsStore } from '../../txnTypes/stores/useTxnTypesStore';
import FaIcon from '@/modules/core/components/decorations/FaIcon.vue';
import NumberPagination from '@/modules/core/components/data-display/NumberPagination.vue';
import { getDateAge } from '@/modules/core/utils/date';
import DateTooltip from '@/modules/core/components/data-display/DateTooltip.vue';
import TxnTooltip from '../components/TxnTooltip.vue';

const { authGet, updateAll: mainStoreUpdateAll } = useMainStore();
const { containers } = useContainersStore();
const { txnTags: txnTypes } = useTxnTagsStore();

const currentPageIndex = ref(0);
const itemsInPage = 15;
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
    if (start === end || totalItems === 0) return "Showing 0 - 0 of 0";
    return `Showing ${start} - ${end} of ${totalItems}`;
});
function onSearchTextChange()
{
    mainPagination.update();
    currentPageIndex.value = 0;
}
function viewTransaction(txnId: string)
{
    router.push(
    {
        name: "singleTransaction",
        params: { id: txnId }
    });
}
onMounted(async () => await mainStoreUpdateAll());
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

* { box-sizing: border-box }

.checkbox
{
    .rel; .center;

    span // Checkmark
    {
        position: absolute;
        border: 1px solid @border;
        border-radius: 5px;

        .size(20px, 20px);
        .center;

        &:after
        {
            width: 12px;
            height: 12px;
            content: '';
            border-radius: 2px;
            background: fade(@focus, 50%);
        }
        &:hover { background: fade(gray, 70%); }
        &:hover:after { background: fade(@focus, 100%); }
    }
}

.arrowHighlight
{
    &:hover { background: @surfaceHigh; }
}

#panel
{
    padding:0px; box-sizing:border-box; gap:15px;
    grid-template-columns: minmax(0,1fr);
    grid-template-rows: auto minmax(0,1fr);

    #searchInput { width: 50%; }
    .fullSize; box-sizing:border-box;

    .pageSelector
    {
        color:gray !important; transform: translateY(-3px);
        display:grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
    }
    #tablePagination { margin-left:5px; }

    #currentPage { .horiMargin(15px); .vertMargin(5px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
    .disabled { pointer-events: none; opacity:0.2; }

    @media only screen and (max-width: 1200px)
    {
        #summaryContainer { display:none; }
        #searchInput { width: 100%; }
        .pageSelector { grid-template-columns: 1fr auto; }
    }

    .uiRangeText
    {
        .tight;
        font-size:14px; display:inline; padding-right:15px;
    }
}

.ellipsisContainer
{
    overflow:hidden; display:flex;
    & > div { overflow:hidden; height:fit-content; white-space: nowrap; text-overflow:ellipsis; }
}

.darkened { opacity: 0.4; }

.topDivTxn
{
    padding: @desktopPagePadding;
    box-sizing: border-box;
    overflow-x:hidden; .fullSize;
    font-family: @font;

    .botChip
    {
        color: #a38ffd;
        background:#282055;
        width: fit-content; height: fit-content;
        padding:5px; cursor:pointer;
        border-radius: 5px;
    }

    .row
    {
        color:gray;
        box-sizing: border-box;
        border-bottom: 1px solid @border;
        display:grid;

        gap: 15px;
        grid-template-columns:  30px     150fr   100px  150fr   50fr          150fr   50px      150fr 100fr;
        grid-template-areas:   'checkbox txnName txnAge txnTag txnValueChange txnFrom arrowIcon txnTo chips';
        grid-template-rows: 1fr; .horiPadding(15px); cursor:pointer;

        & > div { .tight; .yCenter; .ellipsisContainer; }

        &:hover
        {
            background: @focusDark;
            color: @focus;
        }

        @media only screen and (max-width: 1400px)
        {
            &
            {
                grid-template-columns:  30px     150fr   100px  50fr           150fr   50px      150fr 100fr !important;
                grid-template-areas:   'checkbox txnName txnAge txnValueChange txnFrom arrowIcon txnTo chips' !important;

                & > div.txnTag
                {
                    overflow:hidden !important;
                    display:none !important;
                }
            }
        }

        @media only screen and (max-width: 1200px)
        {
            &
            {
                grid-template-columns:  25px     200fr   40fr  100px  100px            !important;
                grid-template-areas:   'checkbox txnName chips txnAge txnValueChange ' !important;

                & > div:not(.checkbox, .txnName, .chips, .txnAge, .txnValueChange)
                {
                    overflow:hidden;
                    display:none;
                }

                .txnValueChange, .txnAge { .xRight; }
            }
        }

        @media only screen and (max-width: 900px)
        {
            &
            {
                grid-template-columns:  25px     200fr   100px  100px            !important;
                grid-template-areas:   'checkbox txnName txnAge txnValueChange ' !important;

                & > div:not(.checkbox, .txnName, .txnAge, .txnValueChange)
                {
                    overflow:hidden;
                    display:none;
                }

                .txnValueChange, .txnAge { .xRight; }
            }
        }

        @media only screen and (max-width: 600px)
        {
            &
            {
                grid-template-columns:  1fr     auto   50px   !important;
                grid-template-areas:   'txnName txnAge txnValueChange' !important;

                & > div:not(.txnName, .txnAge, .txnValueChange)
                {
                    overflow:hidden;
                    display:none;
                }

                .txnValueChange { .xRight; }
            }
        }
    }

    #mainCell
    {
        .fullSize;
        height: 700px;

        @media only screen and (min-height: 750px)
        {
            height:calc(100svh - 190px);
        }
    }

    #mainGrid
    {
        display:grid;
        padding:50px; box-sizing: border-box; gap:15px;
        .fullSize; grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows:100px 250px 1fr 1fr;
        height:2000px;

        grid-template-areas:
        'expensesPanel incomesPanel totalValuePanel netChangePanel'
        '30dExpensesList 30dIncomesList ContainersList TotalValueGraph';

        .listItemTitle { color:gray; font-size:14px; overflow:hidden; white-space: nowrap; text-overflow: ellipsis; }
    }
}

@media only screen and (max-width: 1400px)
{
    .row
    {
        grid-template-columns:  150fr   100px  150fr   50fr           50fr  0px     0px       0px !important;
        grid-template-areas:   'txnName txnAge txnTag txnValueChange chips txnFrom arrowIcon txnTo' !important;
        grid-template-rows: 1fr; .horiPadding(15px); cursor:pointer;
    }
}
</style>