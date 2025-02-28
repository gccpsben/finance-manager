<template>
    <Cell>
        <template #title>Rates API Sources</template>
        <template v-if="currencyRateSrcs.lastSuccessfulData.value?.sources.length == 0">
            <div class="fullSize center" v-if="!isBaseCurrency">
                <div style="grid-template-columns: 1fr; grid-template-rows: auto auto; display: grid; gap: 14px;">
                    <div class="center">No Sources Added</div>
                    <div class="center clickableLink" @click="onNewRateSrcClicked">Create a source</div>
                </div>
            </div>
            <div v-else class="center fullSize" style="white-space: wrap;">
                Cannot add API Source for Base Currency
            </div>
        </template>
        <template v-else>
            <div class="cellContent">
                <OverlapArea class="fullSize">
                    <CustomTable class="rateSrcsTable" rows="40px auto" columns="1fr" rowRows="1fr"
                                :style="{ opacity: currencyRateSrcs.isLoading.value ? 0.3 : 1 }"
                                rowColumns="1fr auto" rowAreas="'name lastFetchTime'" bodyRows="min-content">
                        <template #header>
                            <CustomTableRow class="headerRow fullSize">
                                <CustomTableCell grid-area="name" class="yCenter xLeft">Name</CustomTableCell>
                                <CustomTableCell grid-area="lastFetchTime" class="yCenter xRight">Last Fetch Time</CustomTableCell>
                            </CustomTableRow>
                        </template>
                        <template #body>
                            <CustomTableRow v-for="item in currencyRateSrcs.lastSuccessfulData.value?.sources"
                                            class="bodyRows" @click="selectedCurrencyRateSrc = item.id">
                                <CustomTableCell grid-area="name">
                                    <div class="nameGridArea">
                                        <div class="nameGridAreaName">{{ item.name }}</div>
                                        <div class="nameGridAreaHostname">{{ item.hostname }}</div>
                                    </div>
                                </CustomTableCell>
                                <CustomTableCell grid-area="lastFetchTime" class="lastFetchTimeCell yCenter xRight">
                                    <div class="timeGridArea" v-if="item.lastExecuteTime">
                                        <div class="timeGridAreaTop">{{ formatDate(new Date(item.lastExecuteTime)).split(" ")[0] }}</div>
                                        <div class="timeGridAreaDown">{{ formatDate(new Date(item.lastExecuteTime)).split(" ")[1] }}</div>
                                    </div>
                                    <div v-else>N.A</div>
                                </CustomTableCell>
                            </CustomTableRow>
                        </template>
                    </CustomTable>
                    <NetworkCircularIndicator :error="currencyRateSrcs.reqError.value"
                                            :is-loading="currencyRateSrcs.isLoading.value"/>
                </OverlapArea>
                <div class="fullSize yCenter xRight">
                    <BaseButton icon="add_circle" font-size="12px"
                                @click="onNewRateSrcClicked">
                                New
                    </BaseButton>
                </div>
            </div>
        </template>

        <BaseDialog :is-open="!!selectedCurrencyRateSrc || isCreatingNewSrc"
                    @update:is-open="onDialogIsOpenChanging">
            <template #headerTitle>
                Edit Rate API Source
            </template>
            <template #content>
                <template v-if="editCurrencyRateSourceHook !== null">
                    <br />
                    <OverlapArea>
                        <NetworkCircularIndicator :error="editCurrencyRateSourceHook.srcLoadingError?.value"
                                              :is-loading="editCurrencyRateSourceHook.srcLoadingState.value === 'LOADING'"/>
                        <div class="editDialogGrid" v-if="editCurrencyRateSourceHook.currentData.value">
                            <TextField style="height: 40px;" field-name="Source Name"
                                    v-model:text="editCurrencyRateSourceHook.currentData.value.name" />
                            <TextField style="height: 40px;" field-name="Hostname"
                                    v-model:text="editCurrencyRateSourceHook.currentData.value.hostname" />
                            <TextField style="height: 40px;" field-name="Path"
                                    v-model:text="editCurrencyRateSourceHook.currentData.value.path" />
                            <TextField style="height: 40px;" field-name="Json Query String"
                                    v-model:text="editCurrencyRateSourceHook.currentData.value.jsonQueryString" />
                            <custom-dropdown :options="selectableCurrenciesOptions"
                                class="fullSize" field-name="Ref Amount Currency"
                                v-model:selected-option="editCurrencyRateSourceHook.currentData.value.refAmountCurrencyId" />
                            <div class="currencyRateSrcDialogBtnContainer">
                                <div>
                                    <BaseButton :disabled="!editCurrencyRateSourceHook.isChanged.value"
                                            @click="editCurrencyRateSourceHook.reset">
                                        Reset
                                    </BaseButton>
                                </div>
                                <div>
                                    <BaseButton @click="submitCurrencyRateSrcPatchPostRequest"
                                            :disabled="!editCurrencyRateSourceHook.isChanged.value">
                                        Save
                                    </BaseButton>
                                </div>
                            </div>
                        </div>
                    </OverlapArea>
                </template>
            </template>
        </BaseDialog>
    </Cell>
</template>

<script lang="ts" setup>
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';
import CustomTable from '@/modules/core/components/tables/CustomTable.vue';
import CustomTableRow from '@/modules/core/components/tables/CustomTableRow.vue';
import CustomTableCell from '@/modules/core/components/tables/CustomTableCell.vue';
import Cell from '@/modules/core/components/data-display/Cell.vue';
import { formatDate } from '@/modules/core/utils/date';
import { useGetCurrencyRateSources } from '@/modules/currencies/composables/useGetCurrencyRateSources';
import BaseDialog from '@/modules/core/components/data-display/BaseDialog.vue';
import TextField from '@/modules/core/components/inputs/TextField.vue';
import { computed, ref, watch } from 'vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import { usePostPatchCurrencyRateSrc } from '../composables/useEditCurrencyRateSource';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';

export type RateAPISourcesCellProps =
{
    currencyId: string | null,
    isBaseCurrency?: boolean | null
};

const props = withDefaults(defineProps<RateAPISourcesCellProps>(), { currencyId: null });

const currencyRateSrcs = useGetCurrencyRateSources(() => props.currencyId ?? '', false);
watch(() => props.currencyId, (newVal, _oldVal) => newVal ? currencyRateSrcs.update() : undefined, { immediate: true });
const selectedCurrencyRateSrc = ref<null | string>(null);

const isCreatingNewSrc = ref(false);
const editCurrencyRateSourceHook = usePostPatchCurrencyRateSrc(props.currencyId ?? '');
watch(() => selectedCurrencyRateSrc.value, async () =>
{
    if (!selectedCurrencyRateSrc.value) return null;
    editCurrencyRateSourceHook.loadSrc(selectedCurrencyRateSrc.value);
});

const currenciesStore = useCurrenciesStore();
const selectableCurrenciesOptions = computed(() =>
{
    const items = currenciesStore.currencies.lastSuccessfulData?.rangeItems;
    return items?.map(x => ({ id: x.id, label: x.name, searchTerms: `${x.id} ${x.name}` })) ?? [];
});

async function submitCurrencyRateSrcPatchPostRequest()
{
    await editCurrencyRateSourceHook.submit();

    // If Post/Patch request successful, update the UI as well.
    await currencyRateSrcs.update();
}

function onNewRateSrcClicked()
{
    isCreatingNewSrc.value = true;
    selectedCurrencyRateSrc.value = null;
    editCurrencyRateSourceHook.markSafePoint({
        hostname: "hostname",
        id: "",
        jsonQueryString: "",
        name: "Name",
        path: "",
        refAmountCurrencyId: "JLD"
    });
}

function onDialogIsOpenChanging(isOpen: boolean)
{
    if (isOpen) return;
    selectedCurrencyRateSrc.value = null;
    isCreatingNewSrc.value = false;
}

</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

.bodyRows
{
    &:hover
    {
        background: @focusDark;
        color: @focus;
    }
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    height: 50px;
    grid-template-columns: 1fr auto !important;
    overflow: hidden;
    font-family: @font;

    .nameGridArea
    {
        .fullSize;
        display: grid;
        grid-template-columns: min-content;
        grid-template-rows: 1.2fr 1fr;
        grid-template-areas: 'name' 'hostname';

        .nameGridAreaName { grid-area: name; .yBottom; }
        .nameGridAreaHostname { grid-area: hostname; .yTop; opacity: 0.5; font-size: 12px; }
    }

    .timeGridArea
    {
        .fullSize;
        display: grid;
        grid-template-columns: min-content;
        grid-template-rows: 1.2fr 1fr;
        grid-template-areas: 'top' 'down';

        .timeGridAreaTop { grid-area: top; .yBottom; .xRight; }
        .timeGridAreaDown { grid-area: down; .yTop; opacity: 0.5; font-size: 12px; .xRight; }
    }
}

#currencyTopDiv .headerRow, #currencyTopDiv .bodyRows
{
    & > * { .horiPadding(10px); };
    border-bottom: 1px solid @border;
}

.headerRow
{
    grid-template-columns: 1fr 200px !important;
    overflow: hidden;
}

.editDialogGrid
{
    gap: 14px;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr;
}

.cellContent
{
    .fullSize;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 30px;
    container-name: rateApiSrcCellContentRoot;
    container-type: size;
}

.currencyRateSrcDialogBtnContainer
{
    .leftRightGrid;
    & > *:nth-child(2) { .xRight; }
}

@media only screen and (max-width: 500px)
{
    .currencyRateSrcDialogBtnContainer
    {
        display: grid;
        grid-template-columns: 1fr !important;
        grid-template-rows: auto auto !important;
        gap: 14px;

        .baseButtonRoot { .mobileBaseButton; }
    }
}
</style>