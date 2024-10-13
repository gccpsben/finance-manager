<template>
    <div id="txnTopDiv">
        <div id="txnTopDivInner">
            <div v-if="isTxnFound && selectedTransaction.currentData.value">
                <div>
                    <view-title :title="`Edit Transaction`"
                                hasBackButton @back="router.back()"/>
                </div>
                <div>
                    <br /><br />
                </div>
                <div class="fullSize">
                    <div id="viewTxnGrid">

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
                            <div class="dummy"></div>
                            <button class="defaultButton" :disabled="!isResetButtonAvailable" @click="resetForm()">Reset</button>
                            <div class="center">
                                <button class="defaultButton fullSize" :disabled="!isSaveButtonAvailable || isTxnSaving" @click="submitSave()">
                                    <NetworkCircularIndicator v-if="isTxnSaving || txnSavingError" style="width:23px; height:23px;"
                                                            :is-loading="isTxnSaving" :error="txnSavingError"/>
                                    <div v-if="!isTxnSaving && !txnSavingError">Save</div>
                                </button>
                            </div>
                        </div>

                        <div v-area="'error'" id="formErrorMsg">
                            <div>{{ transactionDetailsErrors }}</div>
                        </div>

                    </div>
                </div>
            </div>
            <div v-else-if="txns.lastSuccessfulData.value?.totalItems === 0" style="height: 100svh;" class="center">
                <StaticNotice type="ERR">
                    <div>
                        Cannot find the transaction requested.
                        <br /> Please check your URL.
                    </div>
                </StaticNotice>
            </div>
            <div v-else class="center" style="height: 100svh;">
                <NetworkCircularIndicator isLoading :error="txns.error.value" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import router from '@/router';
import NetworkCircularIndicator from '@/modules/core/components/networkCircularIndicator.vue';
import StaticNotice from '@/modules/core/components/staticNotice.vue';
import ViewTitle from '@/modules/core/components/viewTitle.vue';import { computed, ref, toRaw, watch } from 'vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetTxnAPI, PutTxnAPI } from '../../../../../api-types/txn';
import { API_PUT_TRANSACTIONS_PATH, API_TRANSACTIONS_PATH } from '@/apiPaths';
import textField from '@/modules/core/components/textField.vue';
import customDropdown from '@/modules/core/components/custom-dropdown.vue';
import { useResettableObject } from '@/resettableObject';
import { useContainersStore } from '@/modules/containers/stores/useContainersStore';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import { isNumeric } from '@/modules/core/utils/numbers';
import { formatDate } from '@/modules/core/utils/date';

const dateFormatToShow = "YYYY-MM-DD hh:mm:ss.ms";
type TxnWorkingEntity = Omit<GetTxnAPI.TxnDTO, 'creationDate'> &
{
    creationDate: string;
};

const txnId = computed(() => router.currentRoute.value.params['id']);
const isTxnFound = computed(() => !txns.isLoading.value && txns.lastSuccessfulData.value?.totalItems === 1);
const { currencies } = useCurrenciesStore();
const { containers } = useContainersStore();

const txns = useNetworkRequest<GetTxnAPI.ResponseDTO>(
{
    url: API_TRANSACTIONS_PATH,
    query: { id: `${txnId.value}` },
    method: "GET",
    body: {  }
}, { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: false });
txns.updateData();

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
const selectedTransaction = useResettableObject<undefined | TxnWorkingEntity>(undefined, (latest, safePoint) =>
{
    // Normalize JSON for comparison (null == '', date in epoch == date in string etc...)
    const normalizedIsEqual = (txn1: TxnWorkingEntity, txn2: TxnWorkingEntity) =>
    {
        if (Object.keys(txn1).length !== Object.keys(txn2).length) return false;
        for (const key of Object.keys(txn1) as (keyof TxnWorkingEntity)[])
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
    if (!selectedTransaction.isChanged.value) return false;
    if (transactionDetailsErrors.value) return false;
    return true;
});
const isTxnSaving = ref(false);
const txnSavingError = ref(undefined);

watch([txns.error, txns.isLoading, txns.lastAxiosStatusCode, txns.queryObj], () =>
{
    const firstTxn = txns.lastSuccessfulData.value?.rangeItems[0];
    if (firstTxn) selectedTransaction.markSafePoint({
        ...toRaw(firstTxn),
        creationDate: formatDate(new Date(firstTxn.creationDate), dateFormatToShow)
    });
});

const autoFillCurrentDateTime = () =>
{
    if (!selectedTransaction.currentData.value) return;
    selectedTransaction.currentData.value.creationDate = formatDate(new Date(), dateFormatToShow)
};
const resetForm = () => { selectedTransaction.reset(); };
const submitSave = async () =>
{
    if (!selectedTransaction.currentData.value) throw new Error(`Cannot save when current data is not defined.`);
    const transformedTxn = structuredClone(toRaw(selectedTransaction.currentData.value));

    // Transform txn body to fit validation:
    (() =>
    {
        if (transformedTxn.toContainer === null)
        {
            transformedTxn.toCurrency = null;
            transformedTxn.toAmount = null;
        }
        if (transformedTxn.fromContainer === null)
        {
            transformedTxn.fromCurrency = null;
            transformedTxn.fromAmount = null;
        }
    })();

    const putTxnRequest = useNetworkRequest<PutTxnAPI.ResponseDTO>
    (
        {
            query: { "targetTxnId": `${txnId.value}` },
            url: `${API_PUT_TRANSACTIONS_PATH}`,
            method: "PUT",
            body:
            {
                title: transformedTxn.title,
                txnTypeId: transformedTxn.txnType,
                creationDate: new Date(transformedTxn.creationDate).getTime(),
                description: transformedTxn.description ?? undefined,
                fromAmount: transformedTxn.fromAmount ?? undefined,
                fromContainerId: transformedTxn.fromContainer ?? undefined,
                fromCurrencyId: transformedTxn.fromCurrency ?? undefined,
                toAmount: transformedTxn.toAmount ?? undefined,
                toContainerId: transformedTxn.toContainer ?? undefined,
                toCurrencyId: transformedTxn.toCurrency ?? undefined
            } satisfies PutTxnAPI.RequestBodyDTO
        },
        {
            updateOnMount: false,
            autoResetOnUnauthorized: true,
            includeAuthHeaders: true
        },
    );

    isTxnSaving.value = true;
    await putTxnRequest.updateData();
    txnSavingError.value = putTxnRequest.error.value;
    isTxnSaving.value = false;
    selectedTransaction.markSafePoint(selectedTransaction.currentData.value);
};
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

#txnTopDiv
{
    container-name: currenciesPage;
    container-type: size;
    .fullSize;

    #txnTopDivInner
    {
        padding: @desktopPagePadding;
        overflow: scroll;
    }
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
        grid-template-columns: 1fr auto auto;
        grid-template-rows: 1fr;
        padding-bottom: 126px;
        gap: 8px;

        & > *
        {
            .fullSize; .xRight; .yBottom;
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

.disabled { opacity: 0.3; pointer-events: none; }
#descriptionTextField:deep(textarea) { padding: 14px; }

@media only screen and (max-width: 500px)
{
    .topDivTxn { padding: @mobilePagePadding; }

    #viewTxnGrid
    {
        grid-template:
            'id              id              ' 45px
            'name            name            ' 45px
            'date            date            ' 45px
            'fromContainer   fromContainer   ' minmax(0px, 45px)
            'fromAmount      fromCurrency    ' minmax(0px, 45px)
            'toContainer     toContainer     ' minmax(0px, 45px)
            'toAmount        toCurrency      ' minmax(0px, 45px)
            '_               _               ' 5px
            'desc            desc            ' minmax(0px, 100px)
            'error           error           ' auto
            'actions         actions         ' 45px
            / 1fr            1fr !important;
    }
}
</style>