<template>

    <div class="topDivTxn">

        <view-title :title="'Transactions'" />
        <br /><br />

        <div v-if="!selectedTransactionID">

            <div id="mainCell">

                <div v-basic="'#panel.gridBase.tight'">
                    <div class="pageSelector">
                        <div class="xLeft yCenter">
                            <fa-icon class="optionIcon" icon="fa-solid fa-rotate" />
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
                                <numberPagination id="tablePagination"
                                                  v-model="currentPageIndex"
                                                  :min-page-readable="1"
                                                  :max-page-readable="mainPagination.lastCallMaxPageIndex.value + 1" />
                            </div>
                        </div>
                    </div>
                    <div class="rel">
                        <div class="fullSize abs" :class="{'darkened': mainPagination.isLoading.value}"
                        style="display:grid; grid-template-rows: repeat(15,1fr);">
                            <div class="row tight"
                                 @click="viewTransaction(item?.id)" style="font-size:14px;"
                                 v-for="item in mainPagination.lastCallResult.value?.rangeItems ?? []">
                                <div v-area.class="'checkbox'" class="tight center">
                                    <div class="checkbox">
                                        <input type="checkbox"/>
                                    </div>
                                </div>
                                <div v-area.class="'txnName'" class="tight yCenter ellipsisContainer">
                                    <div>
                                        {{ item?.title }}
                                    </div>
                                </div>
                                <div v-area.class="'txnAge'" class="tight yCenter ellipsisContainer">
                                    <div>
                                        {{ getDateAge(item?.creationDate) }} ago
                                    </div>
                                </div>
                                <div v-area.class="'txnType'" class="tight yCenter ellipsisContainer">
                                    <div>
                                        {{ getTxnTypeNameById(item?.txnType, txnTypes.lastSuccessfulData?.rangeItems ?? []) }}
                                    </div>
                                </div>
                                <!-- <div v-area.class="'txnValueChange'" class="tight yCenter consoleFont ellipsisContainer"
                                :class="{'disabled': item?.changeInValue == 0}">
                                    <div>{{ formatChangeInValue(item?.changeInValue) }}</div>
                                </div> -->
                                <div v-area.class="'txnFrom'" class="tight yCenter xRight ellipsisContainer">
                                    <div v-if="item?.fromContainer">
                                        {{ getContainerNameById(item?.fromContainer, containers.lastSuccessfulData?.rangeItems ?? []) }}
                                    </div>
                                </div>
                                <div v-area.class="'arrowIcon'" class="center">
                                    <fa-icon icon="fa-solid fa-arrow-right" />
                                </div>
                                <div v-area.class="'txnTo'" class="tight yCenter xLeft ellipsisContainer">
                                    <div v-if="item?.toContainer">
                                        {{ getContainerNameById(item?.toContainer, containers.lastSuccessfulData?.rangeItems ?? []) }}
                                    </div>
                                </div>
                                <!-- <div v-area.class="'chips'" class="tight yCenter">
                                    <div :class="{'botChip': item?.isFromBot}">{{ item?.isFromBot ? 'Bot' : '' }}</div>
                                </div> -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="viewTxnGrid" v-else-if="selectedTransaction?.currentData != undefined">

            <text-field v-area="'id'" :field-name="'ID'" :text="selectedTransactionWorkingCopy!.id!" readonly/>

            <text-field v-area="'name'" :override-theme-color="selectedTransactionWorkingCopy!.title !== '' ? undefined : 'red'"
                        :field-name="'Name'" v-model:text="selectedTransactionWorkingCopy!.title!"/>

            <text-field v-area="'date'" :field-name="'Date'" v-model:text="selectedTransactionWorkingCopy!.creationDate!"
                        :override-theme-color="isEnteredDateValid ? undefined : 'red'">
                <template #fieldActions>
                    <div class="nowButtonContainer">
                        <button class="nowButton" @click="autoFillCurrentDateTime">Now</button>
                    </div>
                </template>
            </text-field>

            <custom-dropdown :options="selectableContainerOptions"
                             class="fullSize" v-area="'fromContainer'" field-name="From Container"
                             v-model:selected-option="selectedTransactionWorkingCopy!.fromContainer!" />
            <custom-dropdown :options="selectableCurrenciesOptions"
                             :class="{'disabled': !selectedTransactionWorkingCopy!.fromContainer}"
                             class="fullSize" v-area="'fromCurrency'" field-name="From Currency"
                             v-model:selected-option="selectedTransactionWorkingCopy!.fromCurrency!" />
            <text-field v-area="'fromAmount'" :field-name="'From Amount'" input-type="number"
                        :class="{'disabled': !selectedTransactionWorkingCopy!.fromContainer}"
                        :override-theme-color="isEnteredFromAmountValid ? undefined : 'red'"
                        v-model:text="selectedTransactionWorkingCopy!.fromAmount!"/>

            <custom-dropdown :options="selectableContainerOptions"
                             class="fullSize" v-area="'toContainer'" field-name="To Container"
                             v-model:selected-option="selectedTransactionWorkingCopy!.toContainer!" />
            <custom-dropdown v-area="'toCurrency'" :options="selectableCurrenciesOptions"
                             :class="{'disabled': !selectedTransactionWorkingCopy!.toContainer}"
                             class="fullSize" field-name="To Currency"
                             v-model:selected-option="selectedTransactionWorkingCopy!.toCurrency!" />
            <text-field v-area="'toAmount'" :field-name="'To Amount'" input-type="number"
                        :class="{'disabled': !selectedTransactionWorkingCopy!.toContainer}"
                        :override-theme-color="isEnteredToAmountValid ? undefined : 'red'"
                        v-model:text="selectedTransactionWorkingCopy!.toAmount!"/>

            <text-field v-area="'desc'" id="descriptionTextField" :field-name="'Description'" input-type="text" always-float textarea-mode
                        v-model:text="selectedTransactionWorkingCopy!.description!"/>

            <div id="resetSaveContainer" v-area="'actions'" v-if="selectedTransaction?.currentData">
                <button class="defaultButton" :disabled="!isResetButtonAvailable" @click="resetForm()">Reset</button>
                <button class="defaultButton" :disabled="!isSaveButtonAvailable" @click="submitSave()">Save</button>
            </div>
        </div>

    </div>
</template>

<script lang="ts" setup>
import { API_TRANSACTIONS_PATH } from "@/apiPaths";
import { getContainerNameById } from '@/modules/containers/utils/containers';
import CustomDropdown from '@/modules/core/components/custom-dropdown.vue';
import numberPagination from '@/modules/core/components/numberPagination.vue';
import textField from '@/modules/core/components/textField.vue';
import useNetworkPaginationNew, { type UpdaterReturnType } from "@/modules/core/composables/useNetworkedPagination";
import vArea from "@/modules/core/directives/vArea";
import { useMainStore } from "@/modules/core/stores/store";
import { formatDate } from '@/modules/core/utils/date';
import { isNullOrUndefined } from "@/modules/core/utils/equals";
import { buildSearchParams } from "@/modules/core/utils/urlParams";
import { getTxnTypeNameById } from '@/modules/txnTypes/utils/transactionTypes';
import { ResettableObject } from "@/resettableObject";
import router from "@/router";
import type { HydratedTransaction } from "@/types/dtos/transactionsDTO";
import { computed, onMounted, ref, toRaw, watch, type Ref } from 'vue';
import type { TxnDTO } from '../../../../../api-types/txn';
import { useContainersStore } from '../../containers/stores/useContainersStore';
import { useTxnTypesStore } from '../../txnTypes/stores/useTxnTypesStore';
import { nextTick } from "vue";
import { useCurrenciesStore } from "@/modules/currencies/stores/useCurrenciesStore";
import { isNumeric } from "@/modules/core/utils/numbers";

const { authGet, getDateAge, updateAll: mainStoreUpdateAll } = useMainStore();
const { currencies } = useCurrenciesStore();
const { containers } = useContainersStore();
const { txnTypes } = useTxnTypesStore();

// #region All Txns View
const currentPageIndex = ref(0);
const itemsInPage = 15;
const searchText = ref("");
const mainPagination = useNetworkPaginationNew<TxnDTO>(
{
    updater: async (start:number, end:number): Promise<UpdaterReturnType<TxnDTO>> =>
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
        name: "transactions",
        params: { id: txnId }
    });
}
onMounted(async () => await mainStoreUpdateAll());
// #endregion

// #region Single Transaction View
const selectedTransactionID = computed(() => router.currentRoute.value.params?.id);
const selectableContainerOptions = computed(() =>
{
    const items = containers.lastSuccessfulData?.rangeItems;
    return items?.map(x => ({ id: x.id, label: x.name, searchTerms: `${x.id} ${x.name}` })) ?? [];
});
const selectableCurrenciesOptions = computed(() =>
{
    const items = currencies.lastSuccessfulData?.rangeItems;
    return items?.map(x => ({ id: x.id, label: x.name, searchTerms: `${x.id} ${x.name}` })) ?? [];
});
const selectedTransaction = ref(undefined) as Ref<undefined | ResettableObject<HydratedTransaction>>;
const selectedTransactionWorkingCopy = computed(() => selectedTransaction.value?.currentData as unknown as Partial<HydratedTransaction> | undefined);
const isEnteredDateValid = computed(() => !isNaN(new Date(`${(selectedTransaction.value?.currentData as any).creationDate}`).getTime()));
const isEnteredFromAmountValid = computed(() => isNumeric(selectedTransactionWorkingCopy?.value?.fromAmount));
const isEnteredToAmountValid = computed(() => isNumeric(selectedTransactionWorkingCopy?.value?.toAmount));
const isTransactionDetailsValid = computed(() =>
{
    const txn = selectedTransaction.value?.currentData as unknown as HydratedTransaction;
    const toContainer = selectedTransactionWorkingCopy.value?.toContainer;
    const toCurrency = selectedTransactionWorkingCopy.value?.toCurrency;
    const fromContainer = selectedTransactionWorkingCopy.value?.fromContainer;
    const fromCurrency = selectedTransactionWorkingCopy.value?.fromCurrency;

    if (!txn) return false;
    if (!txn.fromAmount && !txn.toAmount) return false;
    if (!isEnteredDateValid.value) return false;
    if (!txn.title.trim()) return false;
    if (!!toContainer && !toCurrency) return false;
    if (!!fromContainer && !fromCurrency) return false;
    if (!fromContainer && !toContainer) return false;
    if (!!fromContainer && !isEnteredFromAmountValid.value) return false;
    if (!!toContainer && !isEnteredToAmountValid.value) return false;
    return true;
});
const isResetButtonAvailable = computed(() =>
{
    if (!selectedTransaction.value?.isChanged) return false;
    return true;
});
const isSaveButtonAvailable = computed(() =>
{
    if (!selectedTransaction.value?.isChanged) return false;
    if (!isTransactionDetailsValid.value) return false;
    return true;
});

watch(selectedTransactionID, async () => // Load txn if selected
{
    if (selectedTransactionID.value === undefined) return;
    const queryURL = API_TRANSACTIONS_PATH;
    const txnObject = (await authGet(`${queryURL}?id=${selectedTransactionID.value}`))!.data.rangeItems[0];

    if (!txnObject) return;

    // Format received date to readable, instead of being epoch
    txnObject.creationDate =
            formatDate(new Date(txnObject.creationDate ?? ''), "YYYY-MM-DD hh:mm:ss.ms");

    nextTick(() =>
    {
        selectedTransaction.value = new ResettableObject<HydratedTransaction>(txnObject);

        // We want to treat the creationDate represented in ISO string, and epoch the same
        selectedTransaction.value.dataComparator = (latest, safePoint) =>
        {
            const latestObj = structuredClone(toRaw(latest));
            const safePointObj = structuredClone(toRaw(safePoint));
            if (!latestObj || !safePointObj) return true;
            latestObj.creationDate = `${new Date(latestObj.creationDate).getTime()}`;
            safePointObj.creationDate = `${new Date(safePointObj.creationDate).getTime()}`;
            return JSON.stringify(latestObj) === JSON.stringify(safePointObj);
        };
    });

    await containers.updateData();
}, { immediate: true });

const autoFillCurrentDateTime = () =>
{
    if (!selectedTransactionWorkingCopy.value) return;
    selectedTransactionWorkingCopy.value.creationDate = formatDate(new Date())
};
const resetForm = () => { if (selectedTransaction.value) selectedTransaction.value?.reset(); };
const submitSave = () =>
{
    const transformedCopy = selectedTransactionWorkingCopy.value!;
    console.log(transformedCopy);
};
// #endregion
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.debug2 { background:blue; border:1px solid black; }
* { box-sizing: border-box }

.disabled { opacity: 0.3; pointer-events: none; }

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

#descriptionTextField:deep(textarea) { padding: 14px; }

.nowButtonContainer
{
    .fullSize; .center;
    padding-left: 5px; padding-right: 5px;

    .nowButton
    {
        .defaultButton;
        padding:5px;
        font-size:12px;
        font-weight: bold;
    }
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
    font-family: 'Schibsted Grotesk', sans-serif;

    .botChip
    {
        color: #a38ffd;
        background:#282055;
        width: fit-content; height: fit-content;
        padding:5px; cursor:pointer;
        border-radius: 5px;
    }

    // input[type='number']
    // {
    //     color:white;
    //     background:transparent;
    //     border:1px solid #252525;
    //     width:30px;
    //     padding:0px; .horiMargin(5px);
    //     text-align: center;
    // }

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
        grid-template:
            'id            id            id            id            ' 45px
            'name          name          date          date          ' 45px
            'fromContainer fromContainer toContainer   toContainer   ' minmax(0px, 45px)
            'fromCurrency  fromCurrency  toCurrency    toCurrency    ' minmax(0px, 45px)
            'fromAmount    fromAmount    toAmount      toAmount      ' minmax(0px, 45px)
            '_             _             _             _             ' 5px
            'desc          desc          desc          desc          ' 100px
            'actions       actions       actions       actions       ' 45px
            / 1fr          1fr           1fr           1fr;

        max-height: calc(100svh - 190px);

        .field
        {
            display:grid;
            grid-template-columns: 150px 1fr;
            grid-template-rows: 1fr;
            .fullSize;
        }

        #resetSaveContainer
        {
            .fullSize; .xRight; .yBottom;
            button:nth-child(2)
            {
                margin-left:5px;
            }
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

@media only screen and (max-width: 500px)
{
    .topDivTxn
    {
        padding: @mobilePagePadding;
    }

    #viewTxnGrid
    {
        grid-template:
            'id' 45px
            'name' 45px
            'date' 45px
            'fromContainer' minmax(0px, 45px)
            'fromCurrency' minmax(0px, 45px)
            'fromAmount' minmax(0px, 45px)
            'toContainer' minmax(0px, 45px)
            'toCurrency' minmax(0px, 45px)
            'toAmount' minmax(0px, 45px)
            '_' 5px
            'desc' minmax(0px, 100px)
            'actions' 45px
            / 1fr  !important;
    }
}

</style>