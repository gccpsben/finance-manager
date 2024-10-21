<template>
    <div id="containersTopDiv">
        <div id="containersTopDivInner">
            <div>
                <view-title :title="'Containers'"></view-title>
            </div>
            <div>
                <br /><br />
            </div>
            <div class="fullSize">
                <div class="fullSize">
                <LeftRightGrid style="margin-bottom:14px;" column-width-config="AUTO">
                    <div class="xLeft">
                        <BaseButton icon="add_circle" font-size="12px">
                            Create New Container
                        </BaseButton>
                    </div>
                    <div class="yCenter xRight">
                        <NumberPagination :max-page-readable="mainPagination.lastCallMaxPageIndex.value"
                                            v-model:model-value="mainPagination.currentPage.value"></NumberPagination>
                    </div>
                </LeftRightGrid>
                <OverlapArea class="fullSize">
                    <CustomTable class="allContainersTable" rows="50px auto" columns="1fr" rowRows="1fr" :style="{opacity: containersStore.containers.isLoading ? 0.3 : 1}"
                                 rowColumns="1fr auto" rowAreas="'name value'" bodyRows="min-content">
                        <template #header>
                            <CustomTableRow class="headerRow fullSize" style="font-weight: bold;">
                                <CustomTableCell grid-area="name" class="yCenter xLeft">Name</CustomTableCell>
                                <CustomTableCell grid-area="value" class="yCenter xLeft">Value in {{ currenciesStore.getBaseCurrencySymbol() }}</CustomTableCell>
                            </CustomTableRow>
                        </template>
                        <template #body>
                            <CustomTableRow v-for="item in mainPagination.lastCallResult.value?.rangeItems" class="bodyRows">
                                <CustomTableCell grid-area="name">
                                    <div class="fullSize xLeft yCenter">{{ item.name }}</div>
                                </CustomTableCell>
                                <CustomTableCell grid-area="value">
                                    <div class="fullSize xLeft yCenter">
                                        {{ parseFloat(item.value).toFixed(2) }}
                                    </div>
                                </CustomTableCell>
                            </CustomTableRow>
                        </template>
                    </CustomTable>
                    <NetworkCircularIndicator :error="containersStore.containers.error"
                                            :is-loading="containersStore.containers.isLoading"
                                            style="pointer-events: none;"/>
                </OverlapArea>
            </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import CustomTable from '@/modules/core/components/tables/customTable.vue';
import CustomTableCell from '@/modules/core/components/tables/customTableCell.vue';
import CustomTableRow from '@/modules/core/components/tables/customTableRow.vue';
import NumberPagination from '@/modules/core/components/data-display/numberPagination.vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/networkCircularIndicator.vue';
import { useContainersStore } from '../stores/useContainersStore';
import useNetworkPaginationNew from '@/modules/core/composables/useNetworkedPagination';
import { watch } from 'vue';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import LeftRightGrid from '@/modules/core/components/layout/LeftRightGrid.vue';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';

const currenciesStore = useCurrenciesStore();
const containersStore = useContainersStore();
containersStore.containers.updateData();
currenciesStore.currencies.updateData();
const mainPagination = useNetworkPaginationNew(
{
    updater: async (start:number, end:number) =>
    {
        await containersStore.containers.updateData();
        const containers = containersStore.containers.lastSuccessfulData?.rangeItems ?? [];
        const endIndex = Math.min(containers.length, end);

        return {
            totalItems: containers.length ?? 0,
            startingIndex: start,
            endingIndex: endIndex,
            rangeItems: containers.slice(start, endIndex)
        };
    },
    pageIndex: 0,
    pageSize: 10,
    overflowResolutionHandler: (_, lastAvailablePageIndex) => mainPagination.currentPage.value = lastAvailablePageIndex,
    updateOnMount: true
});
watch(mainPagination.currentPage, () => mainPagination.update());
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box; };

#containersTopDiv
{
    container-name: containersPage;
    container-type: size;

    .fullSize;
    #containersTopDivInner { padding: @desktopPagePadding; }
}

#containersTopDiv .headerRow, #containersTopDiv .bodyRows
{
    & > * { .horiPadding(10px); };
    border-bottom: 1px solid @border;
}

@container containersPage (width <= 450px)
{
    #containersTopDivInner { padding: @mobilePagePadding !important; }
}

.headerRow, .bodyRows { font-family: @font; }
.bodyRows
{
    font-family: @font;
    &:hover
    {
        background: @focusDark;
        color: @focus;
    }
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    height: 60px;
    grid-template-columns: 1fr auto !important;
    overflow: hidden;
}
</style>