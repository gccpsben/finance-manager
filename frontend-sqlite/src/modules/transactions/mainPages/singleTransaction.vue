<template>
    <div id="txnTopDiv">
        <div id="txnTopDivInner">
            <ViewTitle :title="isAddMode ? `Add Transaction` : `Edit Transaction`"
                        hasBackButton @back="router.back()" class="pageTitle"/>
            <div v-if="shouldDisplayMainEditor">
                <div class="fullSize">
                    <div id="viewTxnGrid">

                        <TextField v-area="'name'"
                                    :override-theme-color="!!txnWorkingCopy.currentData.value!.title.trim() ? undefined : 'red'"
                                    :field-name="'Name'" v-model:text="txnWorkingCopy.currentData.value!.title"/>

                        <TextField v-area="'date'" :field-name="'Date'" v-model:text="txnWorkingCopy.currentData.value!.creationDate"
                                    :override-theme-color="editTxnHook.isEnteredDateValid ? undefined : 'red'">
                            <template #fieldActions>
                                <div class="nowButtonContainer">
                                    <BaseButton class="nowButton" @click="autoFillCurrentDateTime">
                                        Now
                                    </BaseButton>
                                </div>
                            </template>
                        </TextField>

                        <div class="subheader" v-area="'fragmentLabel'" >
                            <h3>Fragment {{ currentFragmentIndex + 1 }} of {{ txnWorkingCopy.currentData.value?.fragments.length }}</h3>
                        </div>

                        <CustomDropdown :options="selectableContainerOptions"
                                        class="fullSize" v-area="'fromContainer'" field-name="From Container"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].fromContainer!" />
                        <CustomDropdown :options="selectableCurrenciesOptions" class="currencyDropdown fullSize"
                                        :class="{'disabled': !txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].fromContainer}"
                                        v-area="'fromCurrency'" field-name="From Currency"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].fromCurrency!" />
                        <TextField  v-area="'fromAmount'" field-name="From Amount" input-type="number"
                                    :class="{'disabled': !txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].fromContainer}"
                                    :text="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].fromAmount ?? ''"
                                    @update:text="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].fromAmount = $event === '' ? null : $event"/>

                        <CustomDropdown :options="selectableContainerOptions"
                                        class="fullSize" v-area="'toContainer'" field-name="To Container"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].toContainer!" />
                        <CustomDropdown v-area="'toCurrency'" :options="selectableCurrenciesOptions"
                                        :class="{'disabled': !txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].toContainer}"
                                        field-name="To Currency" class="currencyDropdown fullSize"
                                        v-model:selected-option="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].toCurrency!" />
                        <TextField v-area="'toAmount'" field-name="To Amount" input-type="number"
                                    :class="{'disabled': !txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].toContainer}"
                                    :text="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].toAmount ?? ''"
                                    @update:text="txnWorkingCopy.currentData.value!.fragments[currentFragmentIndex].toAmount = $event === '' ? null : $event"/>

                        <div id="fragPaginationContainer" v-area="'fragPagination'" >
                            <div class="xLeft">
                                <BaseButton @click="addFragment" style="margin-right: 4px;">Add</BaseButton>
                                <BaseButton @click="deleteFragment" :disabled="(txnWorkingCopy.currentData.value?.fragments.length ?? 0) <= 1">Delete</BaseButton>
                            </div>
                            <div class="xRight">
                                <NumberPagination :max-page-readable="txnWorkingCopy.currentData.value?.fragments.length"
                                                  :min-page-readable="1" v-model="currentFragmentIndex"/>
                            </div>
                        </div>

                        <TextField v-area="'desc'" id="descriptionTextField" field-name="Description" input-type="text"
                                    :text="txnWorkingCopy.currentData.value?.description ?? ''" always-float textarea-mode
                                    @update:text="txnWorkingCopy.currentData.value!.description = $event"/>

                        <ChipsSelector field-name="Tags" v-area="'tags'" v-model:values="txnWorkingCopy.currentData.value!.tagIds"
                                       :options="selectableTxnTagsOptions" />

                        <AttachmentsField v-model:file-ids="txnWorkingCopy.currentData.value!.fileIds"
                                          v-area="'attachments'"/>

                        <CustomCheckbox v-area="'excludedFromIE'"
                                        style="font-size: 14px;"
                                        v-model="txnWorkingCopy.currentData.value!.excludedFromIncomesExpenses">
                            Excluded from Expenses / Incomes
                        </CustomCheckbox>

                        <div id="resetSaveContainer" v-area="'actions'" v-if="txnWorkingCopy.currentData">
                            <div class="center">
                                <BaseButton @click="isDeleteDialogOpen = true" class="fullSize">
                                    Delete
                                </BaseButton>
                            </div>
                            <div class="dummy"></div>
                            <BaseButton @click="(currentFragmentIndex = 0); editTxnHook.txnToBeEdited.reset();"
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

                        <div v-area="'id'" id="txnIdArea">
                            <div>Transaction ID: {{ txnWorkingCopy.currentData.value!.id ?? '' }}</div>
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

            <BaseDialog v-model:is-open="isDeleteDialogOpen">
                <template #headerTitle>Confirm Deletion</template>
                <template #content>
                    <div class="">
                        Are you sure you want to delete this transaction? <br /> <br />
                        <div class="leftRightGrid">
                            <div class="xLeft">
                                <BaseButton @click="isDeleteDialogOpen = false">Cancel</BaseButton>
                            </div>
                            <div class="xRight">
                                <BaseButton @click="deleteTxn">
                                    <NetworkCircularIndicator v-if="deleteTxnNetworkHook.isTxnDeleting.value || deleteTxnNetworkHook.txnDeletionError.value"
                                                                style="width:23px; height:23px;"
                                                                :is-loading="deleteTxnNetworkHook.isTxnDeleting.value"
                                                                :error="deleteTxnNetworkHook.txnDeletionError.value"/>
                                    <div v-if="!deleteTxnNetworkHook.isTxnDeleting.value && !deleteTxnNetworkHook.txnDeletionError.value">Delete</div>
                                </BaseButton>
                            </div>
                        </div>
                    </div>
                </template>
            </BaseDialog>

        </div>
    </div>
</template>

<script setup lang="ts">
import router, { ROUTER_NAME_ALL_TRANSACTIONS, ROUTER_NAME_CREATE_NEW_TXN } from '@/router';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import StaticNotice from '@/modules/core/components/data-display/StaticNotice.vue';
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import { computed, ref, watch } from 'vue';
import { formatDate } from '@/modules/core/utils/date';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';
import { DateFormatToShow, useAddTxn, useEditTxn } from '../composables/useEditAddTxn';
import ChipsSelector, { type ChipOption } from '@/modules/core/components/inputs/ChipsSelector.vue';
import TextField from '@/modules/core/components/inputs/TextField.vue';
import CustomDropdown from '@/modules/core/components/inputs/CustomDropdown.vue';
import { useDeleteTxn } from '../composables/useDeleteTxn';
import BaseDialog from '@/modules/core/components/data-display/BaseDialog.vue';
import { wait } from '@/modules/core/utils/wait';
import NumberPagination from '@/modules/core/components/data-display/NumberPagination.vue';
import CustomCheckbox from '@/modules/core/components/inputs/CustomCheckbox.vue';
import AttachmentsField from '@/modules/core/components/data-display/AttachmentsField.vue';
import { useLeaveGuard } from '@/modules/core/composables/useLeaveGuard';

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

const currentFragmentIndex = ref(0);
const isDeleteDialogOpen = ref(false);
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
    return items?.map(x => ({ id: x.id, label: x.ticker, searchTerms: `${x.id} ${x.name} ${x.ticker}` })) ?? [];
});
const selectableTxnTagsOptions = computed(() =>
{
    const items = editTxnHook.txnTags.lastSuccessfulData?.rangeItems ?? [];
    return items.map(item => {
        return {
            label: item.name,
            value: item.id,
            color: '#00FFFF33',
            searchTerms: `${item.name} ${item.id}`
        } satisfies ChipOption
    });
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

useLeaveGuard(txnWorkingCopy.value.isChanged);
autoFillCurrentDateTime();

async function handleSaveBtn()
{
    if (ensureIsAddMode(editTxnHook))
    {
        await editTxnHook.save();
        router.push({name: ROUTER_NAME_ALL_TRANSACTIONS});
        return;
    }
    if (ensureIsEditMode(editTxnHook)) editTxnHook.submitSave();
}

const deleteTxnNetworkHook = useDeleteTxn();
async function deleteTxn()
{
    if (txnId.value === null) return;
    await deleteTxnNetworkHook.deleteTxn(txnId.value);

    // Error occurred, do not redirect.
    if (deleteTxnNetworkHook.txnDeletionError.value) return;

    isDeleteDialogOpen.value = false;

    await wait(500);
    router.push({ name: ROUTER_NAME_ALL_TRANSACTIONS });
}
function addFragment()
{
    if (!txnWorkingCopy.value.currentData.value?.fragments) return;
    txnWorkingCopy.value.currentData.value.fragments.push({
        fromAmount: null,
        fromContainer: null,
        fromCurrency: null,
        toAmount: null,
        toContainer: null,
        toCurrency: null
    });
    currentFragmentIndex.value = txnWorkingCopy.value.currentData.value.fragments.length - 1;
}
function deleteFragment()
{
    if (!txnWorkingCopy.value.currentData.value?.fragments) return;
    const currentFragmentIndexValue = currentFragmentIndex.value;
    currentFragmentIndex.value = 0;
    txnWorkingCopy.value.currentData.value.fragments.splice(currentFragmentIndexValue, 1);
}
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

fieldset
{
    border: 1px solid @border;
    color: #606060;
    font-family: @font;
    font-weight: 100;
    font-size: 12px;
    background: #151515;
    legend { margin-left: 10px; }
}

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

    .pageTitle
    {
        margin-bottom: @desktopPagePadding !important;
    }
}

#viewTxnGrid
{
    font-family: @font;
    display:grid;
    gap: 15px;
    grid-template:
        'date            date            name            name           ' 45px
        'fragmentLabel   fragmentLabel   fragmentLabel   fragmentLabel  ' auto
        'fromContainer   fromContainer   toContainer     toContainer    ' minmax(0px, 45px)
        'fromCurrency    fromCurrency    toCurrency      toCurrency     ' minmax(0px, 45px)
        'fromAmount      fromAmount      toAmount        toAmount       ' minmax(0px, 45px)
        'fragPagination  fragPagination  fragPagination  fragPagination ' auto
        '_               _               _               _              ' 5px
        'desc            desc            attachments     attachments    ' 100px
        'tags            tags            attachments     attachments    ' 150px
        'excludedFromIE  excludedFromIE  excludedFromIE  excludedFromIE ' auto
        'error           error           error           error          ' auto
        'actions         actions         actions         actions        ' auto
        'id              id              id              id             ' auto
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
        grid-template-columns: auto 1fr auto auto;
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
        text-align: start;
        font-family: @font;
        color: @error;
        font-weight: 900;
        .yCenter;
        .xLeft;
    }

    #fragPaginationContainer
    {
        .leftRightGrid;
        margin-bottom: 14px;
    }

    #txnIdArea
    {
        font-family: Consolas;
        color: fade(@foreground, 30%);
        .xLeft;
        text-align: start;
    }
}

.nowButtonContainer
{
    .fullSize; .center;
    padding-left: 5px; padding-right: 5px;

    .nowButton { color: @foreground; }
}

.subheader
{
    margin-top: 14px;
    color: @foreground;
    font-size: 12px;
    font-family: @font;
    .xLeft;
}
.disabled { opacity: 0.3; pointer-events: none; }
#descriptionTextField:deep(textarea) { padding: 14px; }

@media only screen and (max-width: 500px)
{
    #txnTopDivInner { padding: @mobilePagePadding !important; }

    .pageTitle
    {
        margin-bottom: @mobilePagePadding !important;
    }

    #viewTxnGrid
    {
        grid-template:
            'name            name            ' 45px
            'date            date            ' 45px
            'fragmentLabel   fragmentLabel   ' auto
            'fromContainer   fromContainer   ' minmax(0px, 45px)
            'fromAmount      fromCurrency    ' minmax(0px, 45px)
            'toContainer     toContainer     ' minmax(0px, 45px)
            'toAmount        toCurrency      ' minmax(0px, 45px)
            'fragPagination  fragPagination  ' auto
            '_               _               ' 5px
            'desc            desc            ' minmax(0px, 100px)
            'tags            tags            ' 150px
            'attachments     attachments     ' 250px
            'excludedFromIE  excludedFromIE  ' auto
            'error           error           ' auto
            'actions         actions         ' auto
            'id              id              ' auto
            / 1fr            0.4fr !important;
    }
}
</style>