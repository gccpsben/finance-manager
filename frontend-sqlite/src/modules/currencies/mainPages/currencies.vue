<template>
    <div id="currenciesTopDiv">
        <div>
            <view-title :title="'Currencies'"></view-title>
        </div>
        <div>
            <br /><br />
        </div>
        <div class="fullSize">
            <div class="yCenter xRight" style="margin-bottom:14px;">
                <NumberPagination :max-page-readable="mainPagination.lastCallMaxPageIndex.value"
                                    v-model:model-value="mainPagination.currentPage.value"></NumberPagination>
            </div>
            <OverlapArea class="fullSize">
                <CustomTable rows="50px auto" columns="1fr" rowRows="1fr" :style="{opacity: containersStore.currencies.isLoading ? 0.3 : 1}"
                                rowColumns="1fr 125px" rowAreas="'name rateToBase ticker'" bodyRows="40px">
                    <template #header>
                        <CustomTableRow class="headerRow fullSize" style="font-weight: bold;">
                            <CustomTableCell grid-area="name" class="yCenter xLeft">Name</CustomTableCell>
                            <CustomTableCell grid-area="rateToBase" class="yCenter xRight">
                                Rate to {{ containersStore.getBaseCurrencySymbol() }}
                            </CustomTableCell>
                        </CustomTableRow>
                    </template>
                    <template #body>
                        <CustomTableRow v-for="item in mainPagination.lastCallResult.value?.rangeItems" class="bodyRows">
                            <CustomTableCell grid-area="name" class="">
                                <div class="fullSize xLeft yCenter">
                                    {{ item.name }}
                                    <div style="opacity: 0.5; margin-left: 16px;">{{ item.ticker }}</div>
                                    <div v-if="item.isBase" class="baseCurrencyChip">Base</div>
                                </div>
                            </CustomTableCell>
                            <CustomTableCell grid-area="rateToBase" class="yCenter xRight">
                                {{ item.rateToBase }}
                            </CustomTableCell>
                        </CustomTableRow>
                    </template>
                </CustomTable>
                <NetworkCircularIndicator :error="containersStore.currencies.error"
                                          :is-loading="containersStore.currencies.isLoading"
                                          style="pointer-events: none;"/>
            </OverlapArea>
        </div>
    </div>
</template>

<script setup lang="ts">
import CustomTable from '@/modules/core/components/tables/customTable.vue';
import CustomTableCell from '@/modules/core/components/tables/customTableCell.vue';
import CustomTableRow from '@/modules/core/components/tables/customTableRow.vue';
import {  watch } from 'vue';
import { useCurrenciesStore } from '../stores/useCurrenciesStore';
import useNetworkPaginationNew, { type UpdaterReturnType } from '@/modules/core/composables/useNetworkedPagination';
import type { CurrencyDTO } from '../../../../../api-types/currencies';
import NumberPagination from '@/modules/core/components/numberPagination.vue';
import OverlapArea from '@/modules/core/components/overlapArea.vue';
import NetworkCircularIndicator from '@/modules/core/components/networkCircularIndicator.vue';

const mul = (arr: any[], amount: number) =>
{
    const output: any[] = [];
    for (let i = 0; i < amount; i++) output.push(...arr);
    return output;
};

const containersStore = useCurrenciesStore();
containersStore.currencies.updateData();
const mainPagination = useNetworkPaginationNew<CurrencyDTO>(
{
    updater: async (start:number, end:number): Promise<UpdaterReturnType<CurrencyDTO>> =>
    {
        await containersStore.currencies.updateData();
        const currencies = mul(containersStore.currencies.lastSuccessfulData?.rangeItems ?? [], 40);
        const endIndex = Math.min(currencies.length - 1, end);

        return {
            totalItems: currencies.length ?? 0,
            startingIndex: start,
            endingIndex: endIndex,
            rangeItems: currencies.slice(start, endIndex)
        };
    },
    pageIndex: 0,
    pageSize: 15,
    overflowResolutionHandler: (_, lastAvailablePageIndex) => mainPagination.currentPage.value = lastAvailablePageIndex,
    updateOnMount: true
});
watch(mainPagination.currentPage, () => mainPagination.update());
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box; };

#currenciesTopDiv
{
    padding: @desktopPagePadding;
    box-sizing: border-box;
    overflow-x:hidden; .fullSize;
    font-family: @font;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
    grid-template-areas: 'title' 'margin' 'pageContent';

    .currenciesTopDiv
    {
        .debug;
        height: 100%;
    }

    .pageContent
    {
        display: grid;
        grid-template:
            'resetBtn searchField pagination' 35px
            'content content content' 1fr
            / 30px 1fr auto;
        gap: 15px;
    }
}

#currenciesTopDiv .headerRow, #currenciesTopDiv .bodyRows
{
    & > * { .horiPadding(10px); };
    border-bottom: 1px solid @border;
}

.bodyRows
{
    &:hover
    {
        background: @focusDark;
        color: @focus;
    }
    cursor: pointer;
    user-select: none;
}

.baseCurrencyChip
{
    color: cyan;
    background: fade(cyan, 25%);
    .horiPadding(5px);
    border-radius: 5px;
    margin-left: 15px;
    font-size: 12px;
}
</style>