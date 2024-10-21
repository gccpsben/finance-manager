<template>
    <div id="txnTopDiv">
        <div id="txnTopDivInner">
            <div v-if="shouldDisplayMainEditor">
                <div>
                    <view-title :title="isAddMode ? `Add Transaction` : `Edit Transaction`"
                                hasBackButton @back="router.back()"/>
                </div>
                <div>
                    <br /><br />
                </div>
                <div class="fullSize">
                    <div id="viewTxnGrid">

                        <text-field v-area="'id'" :field-name="'ID'"
                                    :text="txnWorkingCopy.currentData.value!.id ?? ''" readonly/>

                        <text-field v-area="'name'"
                                    :override-theme-color="!!txnWorkingCopy.currentData.value!.title.trim() ? undefined : 'red'"
                                    :field-name="'Name'" v-model:text="txnWorkingCopy.currentData.value!.title"/>

                        <text-field v-area="'date'" :field-name="'Date'" v-model:text="txnWorkingCopy.currentData.value!.creationDate"
                                    :override-theme-color="editTxnHook.isEnteredDateValid ? undefined : 'red'">
                            <template #fieldActions>
                                <div class="nowButtonContainer">
                                    <BaseButton class="nowButton" @click="autoFillCurrentDateTime">
                                        Now
                                    </BaseButton>
                                </div>
                            </template>
                        </text-field>

                        <custom-dropdown :options="selectableContainerOptions"
                                        class="fullSize" v-area="'fromContainer'" field-name="From Container"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.fromContainer!" />
                        <custom-dropdown :options="selectableTxnTypesOptions"
                                        class="fullSize" v-area="'txnType'" field-name="Txn Type"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.txnType!" />
                        <custom-dropdown :options="selectableCurrenciesOptions"
                                        :class="{'disabled': !txnWorkingCopy.currentData.value!.fromContainer}"
                                        class="fullSize" v-area="'fromCurrency'" field-name="From Currency"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.fromCurrency!" />
                        <text-field v-area="'fromAmount'" field-name="From Amount" input-type="number"
                                    :class="{'disabled': !txnWorkingCopy.currentData.value!.fromContainer}"
                                    :override-theme-color="editTxnHook.isEnteredFromAmountValid ? undefined : 'red'"
                                    :text="txnWorkingCopy.currentData.value!.fromAmount ?? ''"
                                    @update:text="txnWorkingCopy.currentData.value!.fromAmount = $event"/>

                        <custom-dropdown :options="selectableContainerOptions"
                                        class="fullSize" v-area="'toContainer'" field-name="To Container"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.toContainer!" />
                        <custom-dropdown v-area="'toCurrency'" :options="selectableCurrenciesOptions"
                                        :class="{'disabled': !txnWorkingCopy.currentData.value!.toContainer}"
                                        class="fullSize" field-name="To Currency"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.toCurrency!" />
                        <text-field v-area="'toAmount'" field-name="To Amount" input-type="number"
                                    :class="{'disabled': !txnWorkingCopy.currentData.value!.toContainer}"
                                    :override-theme-color="editTxnHook.isEnteredToAmountValid ? undefined : 'red'"
                                    :text="txnWorkingCopy.currentData.value!.toAmount ?? ''"
                                    @update:text="txnWorkingCopy.currentData.value!.toAmount = $event"/>

                        <text-field v-area="'desc'" id="descriptionTextField" field-name="Description" input-type="text"
                                    :text="txnWorkingCopy.currentData.value?.description ?? ''" always-float textarea-mode
                                    @update:text="txnWorkingCopy.currentData.value!.description = $event"/>

                        <div id="resetSaveContainer" v-area="'actions'" v-if="txnWorkingCopy.currentData">
                            <div class="dummy"></div>
                            <BaseButton @click="editTxnHook.txnToBeEdited.reset()"
                                        :disabled="!editTxnHook.readyToReset.value">
                                Reset
                            </BaseButton>
                            <div class="center">
                                <BaseButton :disabled="!editTxnHook.readyToSave.value || editTxnHook.isTxnSaving.value"
                                            class="fullSize" @click="handleSaveBtn">
                                    <NetworkCircularIndicator v-if="editTxnHook.isTxnSaving.value || editTxnHook.txnSavingError.value"
                                                              style="width:23px; height:23px;"
                                                              :is-loading="editTxnHook.isTxnSaving.value"
                                                              :error="editTxnHook.txnSavingError.value"/>
                                    <div v-if="!editTxnHook.isTxnSaving.value && !editTxnHook.txnSavingError.value">Save</div>
                                </BaseButton>
                            </div>
                        </div>

                        <div v-area="'error'" id="formErrorMsg">
                            <div>{{ editTxnHook.txnErrors.value }}</div>
                        </div>

                    </div>
                </div>
            </div>
            <div v-else-if="shouldDisplayNotFoundScreen" style="height: 100svh;" class="center">
                <StaticNotice type="ERR">
                    <div>
                        Cannot find the transaction requested.
                        <br /> Please check your URL.
                    </div>
                </StaticNotice>
            </div>
            <div v-else class="center" style="height: 100svh;">
                <NetworkCircularIndicator isLoading :error="editTxnHook.txnSavingError.value" />
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import router, { ROUTER_NAME_CREATE_NEW_TXN } from '@/router';
import NetworkCircularIndicator from '@/modules/core/components/data-display/networkCircularIndicator.vue';
import StaticNotice from '@/modules/core/components/data-display/staticNotice.vue';
import ViewTitle from '@/modules/core/components/data-display/viewTitle.vue';
import { computed, watch } from 'vue';
import textField from '@/modules/core/components/inputs/textField.vue';
import customDropdown from '@/modules/core/components/inputs/custom-dropdown.vue';
import { useContainersStore } from '@/modules/containers/stores/useContainersStore';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import { formatDate } from '@/modules/core/utils/date';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';
import { DateFormatToShow, useAddTxn, useEditTxn } from '../composables/useEditAddTxn';

type AddHookReturnType = ReturnType<typeof useAddTxn>;
type EditHookReturnType = ReturnType<typeof useEditTxn>;
type AddOrEditHookReturnType = AddHookReturnType | EditHookReturnType;

// For type-narrowing between AddHook and EditHook
const ensureIsAddMode = (hook: AddOrEditHookReturnType): hook is AddHookReturnType =>
{
    if (isAddMode.value) return true;
    return false;
};
const ensureIsEditMode = (hook: AddOrEditHookReturnType): hook is EditHookReturnType =>
{
    if (isAddMode.value) return false;
    return true;
};

const isAddMode = computed(() => router.currentRoute.value.name === ROUTER_NAME_CREATE_NEW_TXN);

/** The current editing txn id. This will be NULL when in ADD mode. */
const txnId = computed<string | null>(() => isAddMode.value ? null : `${router.currentRoute.value.params['id']}`);
const editTxnHook = isAddMode.value ? useAddTxn() : useEditTxn();
const txnWorkingCopy = computed(() => editTxnHook.txnToBeEdited);
const selectableContainerOptions = computed(() =>
{
    const items = editTxnHook.containers.lastSuccessfulData?.rangeItems;
    return items?.map(x => ({ id: x.id, label: x.name, searchTerms: `${x.id} ${x.name}` })) ?? [];
});
const selectableCurrenciesOptions = computed(() =>
{
    const items = editTxnHook.currencies.lastSuccessfulData?.rangeItems;
    return items?.map(x => ({ id: x.id, label: x.name, searchTerms: `${x.id} ${x.name}` })) ?? [];
});
const selectableTxnTypesOptions = computed(() =>
{
    const items = editTxnHook.txnTypes.lastSuccessfulData?.rangeItems;
    return items?.map(x => ({ id: x.id, label: x.name, searchTerms: `${x.id} ${x.name}` })) ?? [];
});
const autoFillCurrentDateTime = () =>
{
    if (!txnWorkingCopy.value.currentData.value) return;
    txnWorkingCopy.value.currentData.value.creationDate = formatDate(new Date(), DateFormatToShow)
};
const shouldDisplayMainEditor = computed(() =>
{
    if (!isAddMode.value)
        return editTxnHook.txnLoadingState.value === 'LOADED' && txnWorkingCopy.value;
    return true;
});
const shouldDisplayNotFoundScreen = computed(() =>
{
    if (isAddMode.value) return false;
    return editTxnHook.txnLoadingState.value === 'NOT_FOUND';
});

if (ensureIsAddMode(editTxnHook)) editTxnHook.init();
if (ensureIsEditMode(editTxnHook))
{
    watch
    (
        txnId,
        () => editTxnHook.loadTxn(`${router.currentRoute.value.params['id']}`),
        { immediate: true }
    );
}

function handleSaveBtn()
{
    if (ensureIsAddMode(editTxnHook)) editTxnHook.save();
    if (ensureIsEditMode(editTxnHook)) editTxnHook.submitSave();
}
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

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
        'id            id            date          date          ' 45px
        'name          name          txnType       txnType       ' 45px
        'fromContainer fromContainer toContainer   toContainer   ' minmax(0px, 45px)
        'fromCurrency  fromCurrency  toCurrency    toCurrency    ' minmax(0px, 45px)
        'fromAmount    fromAmount    toAmount      toAmount      ' minmax(0px, 45px)
        '_             _             _             _             ' 5px
        'desc          desc          desc          desc          ' 100px
        'error         error         error         error         ' auto
        'actions       actions       actions       actions       ' 35px
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
        height: 100%;
        gap: 8px;

        & > *
        {
            .fullSize;
            .xRight;
            .yBottom;
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

    .nowButton { color: @foreground; }
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
            'txnType         txnType         ' 45px
            'fromContainer   fromContainer   ' minmax(0px, 45px)
            'fromAmount      fromCurrency    ' minmax(0px, 45px)
            'toContainer     toContainer     ' minmax(0px, 45px)
            'toAmount        toCurrency      ' minmax(0px, 45px)
            '_               _               ' 5px
            'desc            desc            ' minmax(0px, 100px)
            'error           error           ' auto
            'actions         actions         ' 45px
            / 0.6fr            1fr !important;
    }
}
</style>