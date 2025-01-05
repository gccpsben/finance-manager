<template>
    <div id="containerTopDiv">
        <div id="containerTopDivInner">
            <div v-if="shouldDisplayMainEditor">
                <div>
                    <view-title :title="isAddMode ? 'Add Container' : 'Edit Container'"
                                :has-back-button="!isAddMode"
                                @back="router.back()"/>
                </div>
                <div>
                    <br /><br />
                </div>
                <div class="fullSize">
                    <div id="viewContainerGrid">
                        <text-field v-area="'id'" :field-name="'ID'"
                                    :text="containerWorkingCopy.currentData.value!.id ?? ''" readonly/>
                        <text-field v-area="'name'" :field-name="'Name'"
                                    v-model:text="containerWorkingCopy.currentData.value!.name"/>

                        <div id="resetSaveContainer" v-area="'actions'" v-if="containerWorkingCopy.currentData">
                            <div class="dummy"></div>
                            <BaseButton @click="editTxnHook.containerToBeEdited.reset()"
                                        :disabled="!editTxnHook.containerToBeEdited.isChanged.value">
                                Reset
                            </BaseButton>
                            <div class="center">
                                <BaseButton :disabled="!editTxnHook.readyToSave.value || editTxnHook.isContainerSaving.value"
                                            class="fullSize" @click="handleSaveBtn">
                                    <NetworkCircularIndicator v-if="editTxnHook.isContainerSaving.value || editTxnHook.containerSavingError.value"
                                                                style="width:23px; height:23px;"
                                                                :is-loading="editTxnHook.isContainerSaving.value"
                                                                :error="editTxnHook.containerSavingError.value"/>
                                    <div v-if="!editTxnHook.isContainerSaving.value && !editTxnHook.containerSavingError.value">Save</div>
                                </BaseButton>
                            </div>
                        </div>
                        <div v-area="'error'" id="formErrorMsg">
                            <div>{{ editTxnHook.containerErrors.value || editTxnHook.containerSavingError.value }}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="shouldDisplayNotFoundScreen" style="height: 100svh;" class="center">
                <StaticNotice type="ERR">
                    <div>
                        Cannot find the container requested.
                        <br /> Please check your URL.
                    </div>
                </StaticNotice>
            </div>
            <div v-else class="center" style="height: 100svh;">
                <NetworkCircularIndicator isLoading :error="editTxnHook.containerSavingError.value" />
            </div>
        </div>
    </div>

</template>

<script lang="ts" setup>
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import { useAddContainer, useEditContainer } from '../composables/useEditAddContainer';
import { computed, watch } from 'vue';
import router, { ROUTER_NAME_ALL_CONTAINERS, ROUTER_NAME_CREATE_NEW_CONTAINER } from '@/router';
import TextField from '@/modules/core/components/inputs/TextField.vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import StaticNotice from '@/modules/core/components/data-display/StaticNotice.vue';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';
import { useLeaveGuard } from '@/modules/core/composables/useLeaveGuard';

type AddHookReturnType = ReturnType<typeof useAddContainer>;
type EditHookReturnType = ReturnType<typeof useEditContainer>;
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

const isAddMode = computed(() => router.currentRoute.value.name === ROUTER_NAME_CREATE_NEW_CONTAINER);
/** The current editing container id. This will be NULL when in ADD mode. */
const containerId = computed<string | null>(() => isAddMode.value ? null : `${router.currentRoute.value.params['id']}`);
const editTxnHook = isAddMode.value ? useAddContainer() : useEditContainer();
const containerWorkingCopy = computed(() => editTxnHook.containerToBeEdited);

const shouldDisplayMainEditor = computed(() =>
{
    if (!isAddMode.value)
        return editTxnHook.containerLoadingState.value === 'LOADED' && containerWorkingCopy.value;
    return true;
});
const shouldDisplayNotFoundScreen = computed(() =>
{
    if (isAddMode.value) return false;
    return editTxnHook.containerLoadingState.value === 'NOT_FOUND';
});

useLeaveGuard(editTxnHook.containerToBeEdited.isChanged);

if (ensureIsAddMode(editTxnHook)) editTxnHook.init();
if (ensureIsEditMode(editTxnHook))
{
    watch
    (
        containerId,
        () => editTxnHook.loadContainer(`${router.currentRoute.value.params['id']}`),
        { immediate: true }
    );
}

async function handleSaveBtn()
{
    if (ensureIsAddMode(editTxnHook))
    {
        const containerAddResult = await editTxnHook.save();

        // Server didn't send back the id, error occurred.
        if (containerAddResult.savedContainerId === undefined) return;

        router.push({ name: ROUTER_NAME_ALL_CONTAINERS });
        return;
    };
    if (ensureIsEditMode(editTxnHook)) await editTxnHook.submitSave();
}
</script>

<style lang="less" scoped>
@import url('@/modules/core/stylesheets/globalStyle.less');

#containerTopDiv
{
    container-name: containersPage;
    container-type: size;
    .fullSize;

    #containerTopDivInner
    {
        padding: @desktopPagePadding;
        overflow: scroll;
    }
}

#viewContainerGrid
{
    display:grid;
    gap: 15px;
    grid-template:
        'id            id            id            id            ' 45px
        'name          name          name          name          ' 45px
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
        font-family: @font;
        color: @error;
        font-weight: 900;
        .yCenter;
        .xLeft;
    }
}
</style>