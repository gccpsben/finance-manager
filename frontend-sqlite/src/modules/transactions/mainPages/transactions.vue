<template>

    <div class="topDivTxn">

        <view-title :title="'Transactions'" @back="router.back()"
                    :hasBackButton="!!selectedTransactionID"/>
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

        <div id="viewTxnGrid" v-else-if="selectedTransaction?.currentData?.value != undefined">

            <text-field v-area="'id'" :field-name="'ID'" :text="selectedTransaction.currentData.value.id ?? ''" readonly/>

            <text-field v-area="'name'" :override-theme-color="!!selectedTransaction.currentData.value.title.trim() ? undefined : 'red'"
                        :field-name="'Name'" v-model:text="selectedTransaction.currentData.value.title"/>

            <text-field v-area="'date'" :field-name="'Date'" v-model:text="selectedTransaction.currentData.value.creationDate"
                        :override-theme-color="isEnteredDateValid ? undefined : 'red'">
                <template #fieldActions>
                    <div class="nowButtonContainer">
                        <button class="nowButton" @click="autoFillCurrentDateTime">Now</button>
                    </div>
                </template>
            </text-field>

            <custom-dropdown :options="selectableContainerOptions"
                             class="fullSize" v-area="'fromContainer'" field-name="From Container"
                             v-model:selected-option="selectedTransaction.currentData.value.fromContainer!" />
            <custom-dropdown :options="selectableCurrenciesOptions"
                             :class="{'disabled': !selectedTransaction.currentData.value.fromContainer}"
                             class="fullSize" v-area="'fromCurrency'" field-name="From Currency"
                             v-model:selected-option="selectedTransaction.currentData.value.fromCurrency!" />
            <text-field v-area="'fromAmount'" field-name="From Amount" input-type="number"
                        :class="{'disabled': !selectedTransaction.currentData.value.fromContainer}"
                        :override-theme-color="isEnteredFromAmountValid ? undefined : 'red'"
                        :text="selectedTransaction.currentData.value.fromAmount ?? ''"
                        @update:text="selectedTransaction.currentData.value.fromAmount = $event"/>

            <custom-dropdown :options="selectableContainerOptions"
                             class="fullSize" v-area="'toContainer'" field-name="To Container"
                             v-model:selected-option="selectedTransaction.currentData.value.toContainer!" />
            <custom-dropdown v-area="'toCurrency'" :options="selectableCurrenciesOptions"
                             :class="{'disabled': !selectedTransaction.currentData.value.toContainer}"
                             class="fullSize" field-name="To Currency"
                             v-model:selected-option="selectedTransaction.currentData.value.toCurrency!" />
            <text-field v-area="'toAmount'" field-name="To Amount" input-type="number"
                        :class="{'disabled': !selectedTransaction.currentData.value.toContainer}"
                        :override-theme-color="isEnteredToAmountValid ? undefined : 'red'"
                        :text="selectedTransaction.currentData.value.toAmount ?? ''"
                        @update:text="selectedTransaction.currentData.value.toAmount = $event"/>

            <text-field v-area="'desc'" id="descriptionTextField" field-name="Description" input-type="text"
                        :text="selectedTransaction.currentData.value.description ?? ''" always-float textarea-mode
                        @update:text="selectedTransaction.currentData.value.description = $event"/>

            <div id="resetSaveContainer" v-area="'actions'" v-if="selectedTransaction?.currentData">
                <div>
                    <button class="defaultButton" :disabled="!isResetButtonAvailable" @click="resetForm()">Reset</button>
                    <button class="defaultButton" :disabled="!isSaveButtonAvailable" @click="submitSave()">Save</button>
                </div>
            </div>

            <div v-area="'error'" id="formErrorMsg">
                <div>{{ transactionDetailsErrors }}</div>
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
import { useResettableObject } from "@/resettableObject";
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
const selectedTransaction = useResettableObject<undefined | HydratedTransaction>(undefined, (latest, safePoint) =>
{
    // Normalize JSON for comparison (null == '', date in epoch == date in string etc...)
    const normalizedIsEqual = (txn1: HydratedTransaction, txn2: HydratedTransaction) =>
    {
        if (Object.keys(txn1).length !== Object.keys(txn2).length) return false;
        for (const key of Object.keys(txn1) as (keyof HydratedTransaction)[])
        {
            const val1 = txn1[key];
            const val2 = txn2[key];
            if ((val1 === null && val2 === '') || val2 === null && val1 === '') continue;
            if (val2 === val1) continue;
            return false;
        }
        return true;
    };

    const latestObj = toRaw(latest);
    const safePointObj = toRaw(safePoint);
    if (!latestObj || !safePointObj) return false;

    return normalizedIsEqual(latestObj, safePointObj);
});
const isEnteredDateValid = computed(() => !isNaN(new Date(`${(selectedTransaction.currentData?.value as any).creationDate}`).getTime()));
const isEnteredFromAmountValid = computed(() => isNumeric(selectedTransaction.currentData?.value?.fromAmount));
const isEnteredToAmountValid = computed(() => isNumeric(selectedTransaction.currentData?.value?.toAmount));
const transactionDetailsErrors = computed<string | undefined>(() =>
{
    const txn = selectedTransaction.currentData.value;
    if (!txn) return 'Loading...';

    const toContainer = txn.toContainer;
    const toCurrency = txn.toCurrency;
    const fromContainer = txn.fromContainer;
    const fromCurrency = txn.fromCurrency;

    if (!txn.fromAmount && !txn.toAmount) return "At least one of 'From' or 'To' sections must be provided.";
    if (!isEnteredDateValid.value) return 'The date provided is invalid.';
    if (!txn.title.trim()) return 'A name must be provided.';
    if (!!toContainer && !toCurrency) return "A currency must be selected in the 'To' section.";
    if (!!fromContainer && !fromCurrency) return "A currency must be selected in the 'From' section.";
    if (!fromContainer && !toContainer) return "Either container in 'From' or container in 'To' is missing.";
    if (!!fromContainer && !isEnteredFromAmountValid.value) return "The value provided in section 'From' must be a number.";
    if (!!toContainer && !isEnteredToAmountValid.value) return "The value provided in section 'to' must be a number.";
    return undefined;
});
const isResetButtonAvailable = computed(() =>
{
    if (!selectedTransaction.isChanged.value) return false;
    return true;
});
const isSaveButtonAvailable = computed(() =>
{
    if (!selectedTransaction.isChanged.value) return false;transactionDetailsErrors
    if (transactionDetailsErrors.value) return false;
    return true;
});

watch(selectedTransactionID, async () => // Load txn if selected
{
    if (selectedTransactionID.value === undefined) return;
    const queryURL = API_TRANSACTIONS_PATH;
    const txnObject = (await authGet(`${queryURL}?id=${selectedTransactionID.value}`))!.data.rangeItems[0] as HydratedTransaction;

    if (!txnObject) return;

    // Format received date to readable, instead of being epoch
    txnObject.creationDate = formatDate(new Date(txnObject.creationDate ?? ''), "YYYY-MM-DD hh:mm:ss.ms");

    nextTick(() => { selectedTransaction.markSafePoint(txnObject); });

    await containers.updateData();
}, { immediate: true });

const autoFillCurrentDateTime = () =>
{
    if (!selectedTransaction.currentData.value) return;
    selectedTransaction.currentData.value.creationDate = formatDate(new Date(), "YYYY-MM-DD hh:mm:ss.ms")
};
const resetForm = () => { selectedTransaction.reset(); };
const submitSave = () =>
{
    selectedTransaction.markSafePoint(selectedTransaction.currentData.value);
    // const transformedCopy = selectedTransactionWorkingCopy.value!;
    // console.log(transformedCopy);
};
// #endregion
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

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
            'error         error         error         error         ' auto
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
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-rows: 1fr;
            padding-bottom: 126px;

            & > *
            {
                .fullSize; .xRight; .yBottom;
                button:nth-child(2)
                {
                    margin-left:5px;
                }
            }
        }

        #formErrorMsg
        {
            color: @error;
            font-weight: 900;
            .yCenter;
            .xLeft;
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
            'error' auto
            'actions' 45px
            / 1fr  !important;
    }
}

</style>