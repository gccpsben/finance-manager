<template>
    <!-- <div id="topDiv">

        <view-title :title="pageTitle" v-model:selectedItem="selectedItem"
        :items="!selectedTransactionID ? ['All Transactions', 'Advanced Filter View'] : []">
        </view-title>
        
        <div v-show="!selectedTransactionID">
            
            <network-pagination id="mainCell" v-if="selectedItem == 'All Transactions'"
            style="height:calc(100svh - 190px);" :updator="updator" :total-items="totalItems"
            ref="pagination" v-slot="props" :itemsInPage="15" :initialItems="100" v-model:currentPage="currentPage">

                <grid-shortcut id="panel" style="padding:0px; box-sizing:border-box; gap:15px;" columns="minmax(0,1fr)" rows="auto minmax(0,1fr)">
                    <div class="pageSelector">
                        <div class="xLeft yCenter">
                            <fa-icon class="optionIcon" icon="fa-solid fa-rotate"></fa-icon>
                            <input type="text" class="fullHeight minTextarea" placeholder="Search for name..." v-model="searchText"
                            style="width:50%;">
                        </div>
                        <div class="xRight">
                            <div class="yCenter">
                                <h2 class="numbersPanelTitle variantTab tight" style="font-size:14px; display:inline; padding-right:15px;">
                                    {{ `Showing ${props.bounds.lower + 1} - ${props.bounds.upper + 1} of ${props.totalItems}` }}
                                </h2>
                            </div>
                            <fa-icon @click="props.previous()" id="previousArrow" class="optionIcon" :disabled="!props.isPreviousArrowAllowed"
                            icon="fa-solid fa-chevron-left"></fa-icon>
                            <input type="number" size="1" v-int-only v-model.lazy="pageReadable"> 
                            <fa-icon @click="props.next()" id="nextArrow" class="optionIcon" icon="fa-solid fa-chevron-right"></fa-icon>
                        </div>
                    </div>
                    <div class="rel">
                        <div class="fullSize abs" :class="{'darkened': props.isLoading}"
                        style="display:grid; grid-template-rows: repeat(15,1fr);">
                            <div class="row tight" @click="viewTransaction(item?.pubID)" style="font-size:14px;" v-for="item in props.pageItems">
                                <div @click.stop="" v-area="'checkbox'" class="tight center">
                                    <div class="checkbox">
                                        <input type="checkbox"/>
                                    </div>
                                </div>
                                <div v-area="'txnName'" class="tight yCenter ellipsisContainer">
                                    <div>{{ item?.title }}</div>
                                </div>
                                <div v-area="'txnAge'" class="tight yCenter ellipsisContainer">
                                    <div>{{ store.getDateAge(item?.date) }} ago</div>
                                </div>
                                <div v-area="'txnType'" class="tight yCenter ellipsisContainer">
                                    <div>{{ getTxnTypeName(item?.typeID) }}</div>
                                </div>
                                <div v-area="'txnValueChange'" class="tight yCenter consoleFont ellipsisContainer" 
                                :class="{'disabled': item?.changeInValue == 0}">
                                    <div>{{ formatChangeInValue(item?.changeInValue) }}</div>
                                </div>
                                <div v-area="'txnFrom'" class="tight yCenter xRight ellipsisContainer">
                                    <div v-if="item?.from">{{ getContainerName(item?.from.containerID) }}</div>
                                </div>
                                <div v-area="'arrowIcon'" class="center">
                                    <fa-icon icon="fa-solid fa-arrow-right"></fa-icon>
                                </div>
                                <div v-area="'txnTo'" class="tight yCenter xLeft ellipsisContainer">
                                    <div v-if="item?.to">{{ getContainerName(item?.to.containerID) }}</div>
                                </div>
                                <div v-area="'chips'" class="tight yCenter">
                                    <div :class="{'botChip': item?.isFromBot}">{{ item?.isFromBot ? 'Bot' : '' }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </grid-shortcut>

            </network-pagination>

            <div style="height:calc(100svh - 190px);" v-if="selectedItem == 'Advanced Filter View'">
                <div style="display:grid; grid-template-columns: 1fr 30px; grid-template-rows: 1fr;">
                    <textarea spellcheck="false" class="noResize fullWidth" v-model="advancedFilterViewExpress"></textarea>
                    <div class="center" id="executeExpression" >
                        <fa-icon icon="fa-solid fa-chevron-right"></fa-icon>
                    </div>
                </div>
            </div>
        </div>

        <div id="viewTxnGrid" v-show="selectedTransactionID">
            <div class="field">
                <div class="tight xLeft yCenter fieldTitle">Name: </div>
                <input type="text" class="fieldText" placeholder="Transaction Name"/>
            </div>
            <div class="field">
                <div class="tight xLeft yCenter fieldTitle">Name: </div>
                <input type="text" class="fieldText" placeholder="Transaction Name"/>
            </div>
        </div>

    </div> -->

    <div id="topDiv">

        <view-title :title="pageTitle" v-model:selectedItem="selectedItem"
        :items="!selectedTransactionID ? ['All Transactions', 'Advanced Filter View'] : []">
        </view-title>

        <div v-show="!selectedTransactionID">

            <div id="mainCell">
                
                <div v-basic="'#panel.gridBase.tight'" v-if="selectedItem == 'All Transactions'">
                    <div class="pageSelector">
                        <div class="xLeft yCenter">
                            <fa-icon class="optionIcon" icon="fa-solid fa-rotate"></fa-icon>
                            <input v-basic="'#searchInput.fullHeight.minTextarea'" type="text" placeholder="Search for name..." v-model="searchText"
                            @change="onSearchTextChange">
                        </div>
                        <div class="xRight">
                            <div v-basic="'#summaryContainer.yCenter'">
                                <h2 class="numbersPanelTitle variantTab tight" style="font-size:14px; display:inline; padding-right:15px;">
                                    Total Value Change: {{ totalValueChange.toFixed(1) }}
                                </h2>
                                <h2 class="numbersPanelTitle variantTab tight" style="font-size:14px; display:inline; padding-right:15px;">
                                    {{ uiRangeText }}
                                </h2>
                            </div>
                            <fa-icon @click="mainPagination.previous()" id="previousArrow" class="optionIcon" :disabled="mainPagination.pageIndex.value == 0"
                            icon="fa-solid fa-chevron-left"></fa-icon>
                            <input type="number" size="1" v-int-only v-model.lazy="pageReadable" min="1"> 
                            <fa-icon @click="mainPagination.next()" id="nextArrow" class="optionIcon" icon="fa-solid fa-chevron-right"></fa-icon>
                        </div>
                    </div>
                    <div class="rel">
                        <div class="fullSize abs" :class="{'darkened': mainPagination.isLoading.value}"
                        style="display:grid; grid-template-rows: repeat(15,1fr);">
                            <div class="row tight" @click="viewTransaction(item?.pubID)" style="font-size:14px;" v-for="item in mainPagination.currentPageItems.value">
                                <div v-area.class="'checkbox'" class="tight center">
                                    <div class="checkbox">
                                        <input type="checkbox"/>
                                    </div>
                                </div>
                                <div v-area.class="'txnName'" class="tight yCenter ellipsisContainer">
                                    <div>{{ item?.title }}</div>
                                </div>
                                <div v-area.class="'txnAge'" class="tight yCenter ellipsisContainer">
                                    <div>{{ store.getDateAge(item?.date) }} ago</div>
                                </div>
                                <div v-area.class="'txnType'" class="tight yCenter ellipsisContainer">
                                    <div>{{ getTxnTypeName(item?.typeID) }}</div>
                                </div>
                                <div v-area.class="'txnValueChange'" class="tight yCenter consoleFont ellipsisContainer" 
                                :class="{'disabled': item?.changeInValue == 0}">
                                    <div>{{ formatChangeInValue(item?.changeInValue) }}</div>
                                </div>
                                <div v-area.class="'txnFrom'" class="tight yCenter xRight ellipsisContainer">
                                    <div v-if="item?.from">{{ getContainerName(item?.from.containerID) }}</div>
                                </div>
                                <div v-area.class="'arrowIcon'" class="center">
                                    <fa-icon icon="fa-solid fa-arrow-right"></fa-icon>
                                </div>
                                <div v-area.class="'txnTo'" class="tight yCenter xLeft ellipsisContainer">
                                    <div v-if="item?.to">{{ getContainerName(item?.to.containerID) }}</div>
                                </div>
                                <div v-area.class="'chips'" class="tight yCenter">
                                    <div :class="{'botChip': item?.isFromBot}">{{ item?.isFromBot ? 'Bot' : '' }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="height:calc(100svh - 190px);" v-if="selectedItem == 'Advanced Filter View'">
                    <div style="display:grid; grid-template-columns: 1fr 30px; grid-template-rows: 1fr;">
                        <textarea spellcheck="false" class="noResize fullWidth" v-model="advancedFilterViewExpress"></textarea>
                        <div class="center" id="executeExpression">
                            <fa-icon icon="fa-solid fa-chevron-right"></fa-icon>
                        </div>
                    </div>
                </div>

            </div>

        </div>

        <!-- <p>{{ selectedTransaction?.currentData == undefined }}</p> -->
        <div id="viewTxnGrid" v-if="selectedTransaction?.currentData != undefined && selectedTransactionID != ''">
            <div class="field">
                <div class="tight xLeft yCenter fieldTitle">Public ID: </div>
                <input type="text" class="fieldText" placeholder="Transaction Name" :value="(selectedTransaction.currentData as any).pubID" disabled/>
            </div>
            <div class="field">
                <div class="tight xLeft yCenter fieldTitle">Name: </div>
                <input type="text" class="fieldText" placeholder="Transaction Name" v-model="(selectedTransaction.currentData as any).title"/>
            </div>
            <div class="field" v-if="(selectedTransaction.currentData as any).from">
                <div class="tight xLeft yCenter fieldTitle">From Container: </div>
                <div class="fullSize dropdown">
                    <custom-dropdown :items="mainStore.containers.map(x => x.pubID)" v-model:currentItem="(selectedTransaction.currentData as any).from.containerID">
                        <template #itemToText="props">
                            <div class="middleLeft">{{ mainStore.containers.find(x => x.pubID == props.item)?.name }}</div>
                        </template>
                    </custom-dropdown>
                </div>
            </div>
            <div class="field" v-if="(selectedTransaction.currentData as any).to">
                <div class="tight xLeft yCenter fieldTitle">To Container: </div>
                <div class="fullSize dropdown">
                    <custom-dropdown :items="mainStore.containers.map(x => x.pubID)" v-model:currentItem="(selectedTransaction.currentData as any).to.containerID">
                        <template #itemToText="props">
                            <div class="middleLeft">{{ mainStore.containers.find(x => x.pubID == props.item)?.name }}</div>
                        </template>
                    </custom-dropdown>
                </div>
            </div>
            <div class="fullSize xRight" v-if="selectedTransaction?.currentData">
                <button class="defaultButton" :disabled="!hasTxnModified" @click="resetForm()">Reset</button>
                <button class="defaultButton" :disabled="!hasTxnModified">Save</button>
            </div>
        </div>

    </div>
</template>

<style lang="less" scoped>
@import '@/stylesheets/globalStyle.less';

.debug2 { background:blue; border:1px solid black; }
* { box-sizing: border-box }

.checkbox
{
    .rel; .center;

    // Checkbox's Box 
    input { }

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

.dropdown
{
    #root_custom_dropdown 
    { 
        width: 100%; 
        background:#191919;
        border: 1px solid #232323;
        border-radius: 5px;
        font-size:14px;
    }
}

.arrowHighlight
{
    &:hover { background: @surfaceHigh; }
}

#executeExpression
{
    color: @foreground;
    font-size:12px; cursor:pointer;
    &:hover { background: @surface; }
}

textarea
{
    box-sizing: border-box;
    background:@background;
    border: 1px solid @border;
    appearance: none;
    outline: none;
    padding:5px;
    height:30px;
    font-size:14px;
    .fg(white);
    .consoleFont;
}

#panel
{
    padding:0px; box-sizing:border-box; gap:15px;
    grid-template-columns: minmax(0,1fr);
    grid-template-rows: auto minmax(0,1fr);

    #searchInput { width: 50%; }
    .fullSize; box-sizing:border-box;
    .panelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
    .pageSelector  
    {
        color:gray !important; transform: translateY(-3px); 
        display:grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
    }

    #currentPage { .horiMargin(15px); .vertMargin(5px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
    .disabled { pointer-events: none; opacity:0.2; }

    @media only screen and (max-width: 1200px) 
    {
        #summaryContainer { display:none; }
        #searchInput { width: 100%; }
        .pageSelector { grid-template-columns: 1fr auto; }
    }
}

.ellipsisContainer
{
    overflow:hidden; display:flex;
    & > div { overflow:hidden; height:fit-content; white-space: nowrap; text-overflow:ellipsis; }
}

.darkened { opacity: 0.4; }

#topDiv
{
    padding:50px; box-sizing: border-box;
    overflow-x:hidden; .fullSize;
    font-family: 'Schibsted Grotesk', sans-serif;
    .gradBackground;

    .botChip
    {
        color: #a38ffd;
        background:#282055;
        width: fit-content; height: fit-content;
        padding:5px; cursor:pointer;
        border-radius: 5px;
    }

    input[type='number']
    {
        color:white;
        background:transparent; 
        border:1px solid #252525;
        width:30px;
        padding:0px; .horiMargin(5px);
        text-align: center;
    }

    .row
    {
        background:#050505; color:gray;
        box-sizing: border-box; border-bottom:1px solid #151515;
        display:grid; 

        gap: 15px;
        grid-template-columns:  30px     150fr   100px  150fr   50fr          150fr   50px      150fr 100fr;
        grid-template-areas:   'checkbox txnName txnAge txnType txnValueChange txnFrom arrowIcon txnTo chips';
        grid-template-rows: 1fr; .horiPadding(15px); cursor:pointer;

        &:hover 
        {
            background: @focusDark;
            color: @focus;
        }

        .rowContent
        {
            display:grid; box-sizing: border-box;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr 1fr;   
        }

        @media only screen and (max-width: 1400px)
        {
            & 
            {
                grid-template-columns:  30px     150fr   100px  50fr           150fr   50px      150fr 100fr !important;
                grid-template-areas:   'checkbox txnName txnAge txnValueChange txnFrom arrowIcon txnTo chips' !important;

                & > div.txnType
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

    #viewTxnGrid
    {
        display:grid;
        gap: 15px;
        grid-template-columns: 1fr;
        grid-template-rows: auto auto 1fr;
        height: calc(100svh - 190px);

        .field
        {
            display:grid;
            grid-template-columns: 150px 1fr;
            grid-template-rows: 1fr;
            height:35px;
        }
    }
}

@media only screen and (max-width: 1400px) 
{
    .row
    {
        grid-template-columns:  150fr   100px  150fr   50fr           50fr  0px     0px       0px !important; 
        grid-template-areas:   'txnName txnAge txnType txnValueChange chips txnFrom arrowIcon txnTo' !important;
        grid-template-rows: 1fr; .horiPadding(15px); cursor:pointer;    
    }
}

</style>

<script lang="ts" setup> 
import { API_TRANSACTIONS_PATH, useMainStore } from "@/stores/store";
import type { transactions } from '@prisma/client';
import vIntOnly from "snippets/vite-vue-ts/directives/vIntegerOnly";
import vArea from "snippets/vite-vue-ts/directives/vArea";
import { ref, onMounted, withDirectives, type Ref, computed, watch, nextTick, type UnwrapRef, unref } from 'vue';
import router from "@/router/router";
import useNetworkPagination, { type updatorReturnType } from "@/networkedPagination";
import { ResettableObject } from "@/resettableObject";

// CONSTANTS:
const itemsInPage = 15;

const store = useMainStore();
const pageTitle = computed(() => { return "Transactions" });
const getTxnType = (txn:transactions) =>
{ 
    if (txn.from && txn.to) return "Transfer";
    else if (txn.from && !txn.to) return "Expense";
    else return "Income"; 
};
const getTxnTypeName = (typePubID: string) => 
{
    return store?.txnTypes?.find(x => x.pubID == typePubID)?.name ?? "<undefined>";
};
const moveToPageZero = () => { mainPagination.pageIndex.value = 0; };
function getContainerName(pubID: string)
{
    return store?.containers?.find(x => x.pubID == pubID)?.name ?? "undefined";
}
function formatChangeInValue(value:number)
{
    if (value == undefined) return '';
    if (value == 0) return '~'
    if (value > 0) return `+${value.toFixed(1)}`;
    else return value.toFixed(1);
}
// #endregion

// #region All transactions view:
const currentPage = ref(0);
const searchText = ref("");
const totalItems = ref(0);
const mainPagination = useNetworkPagination(updator, totalItems, ref(itemsInPage), ref(0), ref(100));
const uiRangeText = computed(() => 
{ 
    let upperBound = Math.min(mainPagination.upperBoundIndex.value + 1, mainPagination.totalItems.value);

    return `Showing ${mainPagination.lowerBoundIndex.value + 1}` + ` - ` +
    `${upperBound}` + ` of ` +
    `${mainPagination.totalItems.value}`;
});
const selectedTransactionID = computed(() => { return router.currentRoute.value.params?.pubID });
const pageReadable = computed(
{
    get() { return mainPagination.pageIndex.value + 1; },
    set(value:any) 
    {
        if (value <= 0) { console.warn(`Attempt to set pageReadable to 0. Aborting...`); return; }
        currentPage.value = value - 1; 
        mainPagination.pageIndex.value = currentPage.value;
    } 
});
// The total value change of the current query. Notice that this also includes the items OUTSIDE the current view, and this value is 
// returned by the server.
const totalValueChange = ref(0);

function onSearchTextChange()
{
    mainPagination.resetCache();
    moveToPageZero();
}

async function updator(start:number, count:number): Promise<updatorReturnType>
{
    let sendQuery = async (url:string) => { return (await (store.authGet(url))!)!.data };
    let responseJSON = {} as any;
    let queryURL = API_TRANSACTIONS_PATH;

    let fullQuery = `${queryURL}?start=${start}&end=${start+count}`;
    if (searchText.value !== "") fullQuery = `${queryURL}?start=${start}&end=${start+count}&text=${searchText.value}`;
    
    responseJSON = await sendQuery(fullQuery);
    totalValueChange.value = responseJSON.totalValueChange;

    return {
        totalItems: responseJSON.totalItems,
        startingIndex: responseJSON.startingIndex,
        endingIndex: responseJSON.endingIndex,
        rangeItems: responseJSON.rangeItems
    };
}

// #endregion

// #region Advanced Filter View:
const filteredViewItems = ref([]) as Ref<transactions[]>;
const isAdvancedViewLoading = ref(false);
const advancedFilterViewExpress = ref("");

async function executeExpression()
{
    isAdvancedViewLoading.value = true;
    let allTxns:any[] = (await (store.authGet(`/api/v1/finance/transactions`))!)!.data;
    isAdvancedViewLoading.value = false;
}
// #endregion

// #region Single Transaction View
const hasTxnModified = ref(false) as Ref<boolean>;
const selectedItem = ref('All Transactions');
const selectedTransaction = ref(undefined) as Ref<undefined | ResettableObject<any>>;

const mainStore = useMainStore();
watch(selectedTransactionID, async () => 
{
    let queryURL = API_TRANSACTIONS_PATH;
    let txnObject = (await store.authGet(`${queryURL}?pubid=${selectedTransactionID.value}`))!.data;
    nextTick(() => { selectedTransaction.value = new ResettableObject<any>(txnObject); });
    await mainStore.updateContainers();

}, { immediate: true, deep: true });

watch(selectedTransaction, () => 
{ 
    nextTick(() => 
    {
        hasTxnModified.value = unref(selectedTransaction.value?.isChanged) ?? false; 
    });
}, { deep: true });

function viewTransaction(pubID: string)
{
    router.push(
    {
        name: "transactions",
        params: { pubID: pubID }
    });
}

function resetForm() { if (selectedTransaction) selectedTransaction.value?.reset(); }
// #endregion

onMounted(async () => 
{
    await store.updateAll();
});

</script>