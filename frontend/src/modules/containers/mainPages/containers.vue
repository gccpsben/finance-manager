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
                        <BaseButton icon="add_circle" font-size="12px" @click="handleNewContainerBtn">
                            Create New Container
                        </BaseButton>
                    </div>
                    <div class="yCenter xRight">
                        <NumberPagination :min-page-readable="1"
                                          :max-page-readable="mainPagination.lastCallMaxPageIndex.value + 1"
                                          v-model="currentPageIndex" />
                    </div>
                </LeftRightGrid>
                <OverlapArea class="fullSize">
                    <CustomTable class="allContainersTable" rows="50px auto" columns="1fr" rowRows="1fr"
                                 :style="{opacity: mainPagination.isLoading.value ? 0.3 : 1}"
                                 rowColumns="1fr auto" rowAreas="'name value'" bodyRows="min-content">
                        <template #header>
                            <CustomTableRow class="headerRow fullSize" style="font-weight: bold;">
                                <CustomTableCell grid-area="name" class="yCenter xLeft">Name</CustomTableCell>
                                <CustomTableCell grid-area="value" class="yCenter xLeft">Value in {{ currenciesStore.getBaseCurrencySymbol() }}</CustomTableCell>
                            </CustomTableRow>
                        </template>
                        <template #body>
                            <CustomTableRow v-for="item in mainPagination.lastCallResult.value?.rangeItems"
                                            @click="viewContainer(item.id)" class="bodyRows">
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
                    <NetworkCircularIndicator :error="containersFetchRequest.error.value"
                                              :is-loading="containersFetchRequest.isLoading.value"
                                              style="pointer-events: none;"/>
                </OverlapArea>
            </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import CustomTable from '@/modules/core/components/tables/CustomTable.vue';
import CustomTableCell from '@/modules/core/components/tables/CustomTableCell.vue';
import CustomTableRow from '@/modules/core/components/tables/CustomTableRow.vue';
import NumberPagination from '@/modules/core/components/data-display/NumberPagination.vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import { useContainersStore } from '../stores/useContainersStore';
import useNetworkPaginationNew from '@/modules/core/composables/useNetworkedPagination';
import { ref, watch } from 'vue';
import { useCurrenciesStore } from '@/modules/currencies/stores/useCurrenciesStore';
import LeftRightGrid from '@/modules/core/components/layout/LeftRightGrid.vue';
import BaseButton from '@/modules/core/components/inputs/BaseButton.vue';
import router, { ROUTER_NAME_CREATE_NEW_CONTAINER, ROUTER_NAME_EDIT_SINGLE_CONTAINER, ROUTER_NAME_SINGLE_CONTAINER_OVERVIEW } from '@/router';
import { API_CONTAINERS_PATH } from '@/apiPaths';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetContainerAPI } from '../../../../../api-types/container';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';

const currenciesStore = useCurrenciesStore();
currenciesStore.currencies.updateData();
const containersFetchRequest = useNetworkRequest<GetContainerAPI.ResponseDTO>('', { includeAuthHeaders: true, updateOnMount: false } );
const currentPageIndex = ref(0);
const mainPagination = useNetworkPaginationNew(
{
    updater: async (start:number, end:number) =>
    {
        containersFetchRequest.setQueryObj(
        {
            query: { start: `${start}`, end: `${end}` },
            url: API_CONTAINERS_PATH
        });

        await containersFetchRequest.updateData();
        const containers = containersFetchRequest.lastSuccessfulData.value?.rangeItems ?? [];

        return {
            totalItems: containersFetchRequest.lastSuccessfulData.value?.totalItems ?? 0,
            startingIndex: start,
            endingIndex: containersFetchRequest.lastSuccessfulData.value?.endingIndex ?? 0,
            rangeItems: containers
        };
    },
    pageIndex: currentPageIndex,
    pageSize: 10,
    overflowResolutionHandler: (_, lastAvailablePageIndex) => mainPagination.currentPage.value = lastAvailablePageIndex,
    updateOnMount: true
});
watch(mainPagination.currentPage, () => mainPagination.update());

function viewContainer(conId: string)
{
    router.push(
    {
        name: ROUTER_NAME_SINGLE_CONTAINER_OVERVIEW,
        params: { id: conId }
    });
}

function handleNewContainerBtn()
{
    router.push(
    {
        name: ROUTER_NAME_CREATE_NEW_CONTAINER,
        params: { }
    });
}
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