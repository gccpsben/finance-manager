<template>
    <div id="currenciesTopDiv">
        <div id="currenciesTopDivInner">

            <div id="titleArea">
                <view-title :title="'Currencies'"/>
            </div>

            <div id="searchArea">
                <input placeholder="Search for currencies..."/>
            </div>

            <div id="contentArea">
                <OverlapArea class="fullSize">
                    <CustomTable class="allCurrenciesTable" rows="50px auto" columns="1fr" rowRows="1fr"
                                 :style="{opacity: currenciesStore.currencies.isLoading ? 0.3 : 1}"
                                 rowColumns="1fr auto auto" rowAreas="'name rateToBase rateHistory'" bodyRows="min-content">
                        <template #header>
                            <CustomTableRow class="headerRow fullSize" style="font-weight: bold;">
                                <CustomTableCell grid-area="name" class="yCenter xLeft headerRowName">Name</CustomTableCell>
                                <CustomTableCell grid-area="rateToBase" class="yCenter xRight headerRowRateToBase">
                                    Rate to {{ currenciesStore.getBaseCurrencySymbol() }}
                                </CustomTableCell>
                                <CustomTableCell grid-area="rateHistory" class="yCenter xRight headerRateHistory">
                                    History 7d
                                </CustomTableCell>
                            </CustomTableRow>
                        </template>
                        <template #bodyOuter>
                            <div style="overflow-y: auto;">
                                <CustomTableRow v-for="item in mainPagination.lastCallResult.value?.rangeItems" class="bodyRows"
                                            @click="viewCurrency(item.id)">
                                    <CustomTableCell grid-area="name">
                                        <div class="nameGridArea">
                                            <div class="nameGridAreaName">{{ item.name }}</div>
                                            <div class="nameGridAreaTicker">{{ item.ticker }}</div>
                                            <div class="nameGridAreaChips" v-if="item.isBase">
                                                <div class="baseCurrencyChip">Base</div>
                                            </div>
                                        </div>
                                    </CustomTableCell>
                                    <CustomTableCell grid-area="rateToBase" class="yCenter xRight">
                                        {{ item.rateToBase }}
                                    </CustomTableCell>
                                    <CustomTableCell grid-area="rateHistory">
                                        <CurrencyRateHistoryThumbnail :currency-id="item.id" />
                                    </CustomTableCell>
                                </CustomTableRow>
                            </div>
                        </template>
                    </CustomTable>
                    <NetworkCircularIndicator :error="currenciesStore.currencies.error"
                                            :is-loading="currenciesStore.currencies.isLoading"
                                            style="pointer-events: none;"/>
                </OverlapArea>
            </div>

            <div id="paginationArea">
                <div class="xLeft">
                    Showing {{ mainPagination.lastCallResult.value?.rangeItems.length }} items
                </div>
                <div class="xRight">
                    <NumberPagination :max-page-readable="mainPagination.lastCallMaxPageIndex.value"
                    v-model:model-value="mainPagination.currentPage.value"></NumberPagination>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import CustomTable from '@/modules/core/components/tables/customTable.vue';
import CustomTableCell from '@/modules/core/components/tables/CustomTableCell.vue';
import CustomTableRow from '@/modules/core/components/tables/CustomTableRow.vue';
import { watch } from 'vue';
import { useCurrenciesStore } from '../stores/useCurrenciesStore';
import useNetworkPaginationNew, { type UpdaterReturnType } from '@/modules/core/composables/useNetworkedPagination';
import type { CurrencyDTO } from '../../../../../api-types/currencies';
import NumberPagination from '@/modules/core/components/data-display/NumberPagination.vue';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import CurrencyRateHistoryThumbnail from '../components/CurrencyRateHistoryThumbnail.vue';
import router from '@/router';

const currenciesStore = useCurrenciesStore();
currenciesStore.currencies.updateData();
const mainPagination = useNetworkPaginationNew<CurrencyDTO>(
{
    updater: async (start:number, end:number): Promise<UpdaterReturnType<CurrencyDTO>> =>
    {
        await currenciesStore.currencies.updateData();
        const lastSuccessfulData = currenciesStore.currencies.lastSuccessfulData;
        let currencies = lastSuccessfulData?.rangeItems ?? [];
        const endIndex = Math.min(currencies.length, end);

        return {
            totalItems: lastSuccessfulData?.totalItems ?? 0,
            startingIndex: start,
            endingIndex: endIndex,
            rangeItems: lastSuccessfulData?.rangeItems ?? []
        };
    },
    pageIndex: 0,
    pageSize: 999,
    overflowResolutionHandler: (_, lastAvailablePageIndex) => mainPagination.currentPage.value = lastAvailablePageIndex,
    updateOnMount: true
});
watch(mainPagination.currentPage, () => mainPagination.update());

function viewCurrency(id: string)
{
    router.push(
    {
        name: "singleCurrency",
        params: { cid: id }
    });
}
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box; overflow: hidden; };

@pagePadding: 50px;

#currenciesTopDiv
{
    container-name: currenciesPage;
    container-type: size;

    overflow-x:hidden;
    .fullSize;
    font-family: @font;

    #currenciesTopDivInner
    {
        .fullSize;
        display: grid;
        grid-template:
            "title" auto
            "search" auto
            "content" 1fr
            "pagination" auto
            / 1fr;

        #titleArea
        {
            padding: @pagePadding;
            grid-area: title;
        }

        #searchArea
        {
            border-top: 1px solid @border;
            border-bottom: 1px solid @border;
            padding: 15px;
            padding-left: @pagePadding;
            grid-area: search;
            input { .fullSize; appearance: none; outline: none; }
        }

        #contentArea
        {
            .fullSize;
            grid-area: content;

            .baseCurrencyChip
            {
                color: cyan;
                background: fade(cyan, 25%);
                .horiPadding(5px);
                border-radius: 5px;
                font-size: 12px;
            }

            .headerRow, .bodyRows
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

                .horiPadding(40px);
                cursor: pointer;
                user-select: none;
                white-space: nowrap;
                height: 60px;
                grid-template-columns: 1fr auto 200px !important;
                overflow: hidden;

                .nameGridArea
                {
                    .fullSize;
                    display: grid;
                    grid-template-columns: min-content min-content min-content;
                    grid-template-rows: 1fr;
                    grid-template-areas: 'name ticker chips';
                    gap: 15px;

                    .nameGridAreaName { grid-area: name; .center; }
                    .nameGridAreaTicker { grid-area: ticker; .center; opacity: 0.5; }
                    .nameGridAreaChips { grid-area: chips; .center; }
                }
            }

            .headerRow
            {
                .horiPadding(40px);
                grid-template-columns: 1fr auto 200px !important;
                overflow: hidden;
            }

            @container currenciesPage (width <= 650px)
            {
                .bodyRows, .headerRow
                {
                    grid-template-columns: 1fr auto 100px !important;
                }
            }

            @container currenciesPage (width <= 450px)
            {
                .headerRateHistory { display: none !important; }

                .nameGridArea
                {
                    grid-template:
                        'padding_1      padding_1   ' 1fr
                        'name           chips       ' min-content
                        'ticker         ticker      ' min-content
                        'padding_2      padding_2   ' 1fr
                        / min-content   min-content  !important;
                    gap: 0px !important;
                }

                .bodyRows
                {
                    height: 65px;
                    grid-template-columns: 1fr auto 0px !important;
                }
                .headerRow { grid-template-columns: 1fr auto 0px !important; }

                .nameGridAreaName { grid-area: name; .yBottom; .xLeft !important; }
                .nameGridAreaTicker { grid-area: ticker; .yTop !important; .xLeft !important; opacity: 0.5; }
                .nameGridAreaChips { grid-area: chips; padding-left: 10px; .xLeft !important; }
            }
        }

        #paginationArea
        {
            padding: 14px;
            .horiPadding(@pagePadding);
            color: @foreground;
            border-top: 1px solid @border;
            box-shadow: 0px 0px 5px black;
            .leftRightGrid(auto);
        }
    }
}
</style>