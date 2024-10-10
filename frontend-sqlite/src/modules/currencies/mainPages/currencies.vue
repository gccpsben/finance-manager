<template>
    <div id="currenciesTopDiv">
        <div id="currenciesTopDivInner">
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
                    <CustomTable class="allCurrenciesTable" rows="50px auto" columns="1fr" rowRows="1fr" :style="{opacity: containersStore.currencies.isLoading ? 0.3 : 1}"
                                rowColumns="1fr auto auto" rowAreas="'name rateToBase rateHistory'" bodyRows="min-content">
                        <template #header>
                            <CustomTableRow class="headerRow fullSize" style="font-weight: bold;">
                                <CustomTableCell grid-area="name" class="yCenter xLeft">Name</CustomTableCell>
                                <CustomTableCell grid-area="rateToBase" class="yCenter xRight">
                                    Rate to {{ containersStore.getBaseCurrencySymbol() }}
                                </CustomTableCell>
                                <CustomTableCell grid-area="rateHistory" class="center">
                                    History 7d
                                </CustomTableCell>
                            </CustomTableRow>
                        </template>
                        <template #body>
                            <CustomTableRow v-for="item in mainPagination.lastCallResult.value?.rangeItems" class="bodyRows">
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
                        </template>
                    </CustomTable>
                    <NetworkCircularIndicator :error="containersStore.currencies.error"
                                            :is-loading="containersStore.currencies.isLoading"
                                            style="pointer-events: none;"/>
                </OverlapArea>
            </div>
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
import CurrencyRateHistoryThumbnail from '../components/currencyRateHistoryThumbnail.vue';

const containersStore = useCurrenciesStore();
containersStore.currencies.updateData();
const mainPagination = useNetworkPaginationNew<CurrencyDTO>(
{
    updater: async (start:number, end:number): Promise<UpdaterReturnType<CurrencyDTO>> =>
    {
        await containersStore.currencies.updateData();
        const currencies = containersStore.currencies.lastSuccessfulData?.rangeItems ?? [];
        const endIndex = Math.min(currencies.length, end);

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
    container-name: currenciesPage;
    container-type: size;

    #currenciesTopDivInner { padding: @desktopPagePadding; }

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
    #currenciesTopDivInner { padding: @mobilePagePadding !important; }

    .nameGridArea
    {
        grid-template:
            'padding_1 padding_1' 1fr
            'name chips' min-content
            'ticker ticker' min-content
            'padding_2 padding_2' 1fr
            / min-content min-content !important;
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

.baseCurrencyChip
{
    color: cyan;
    background: fade(cyan, 25%);
    .horiPadding(5px);
    border-radius: 5px;
    font-size: 12px;
}
</style>