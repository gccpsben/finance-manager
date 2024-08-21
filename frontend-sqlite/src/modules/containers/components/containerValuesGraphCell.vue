<template>
    <pagination id="pagination" :items="sortedContainers" :itemsInPage="1" v-model:currentPage="currentPage" v-slot="props" style="overflow:hidden; box-sizing:border-box;">
        <grid-shortcut id="graphPanel" style="padding:15px; gap:15px;" columns="1fr" rows="auto 1fr">
            <grid-shortcut rows="1fr" columns="1fr auto">
                <h2 class="graphPanelTitle">{{ title }}</h2>
                <div class="pageSelector">
                    <numberPagination v-model="props.currentPage" :min-page-readable="1" 
                                      :max-page-readable="containersStore.containers?.lastSuccessfulData?.rangeItems.length ?? 0 + 1"></numberPagination>
                </div>
            </grid-shortcut>
            <div style="gap:15px; display:grid; grid-template-rows: 1fr auto;">             
                <div style="border-bottom:1px solid #303030; padding-bottom:15px;" v-if="props.pageItems[0] != undefined">
                    <pagination style="display:grid; grid-template-rows: 1fr auto;" class="fullHeight" v-slot="props2" :items="getContainerBalances(props.pageItems[0].balances)" :itemsInPage="3">
                        <div>
                            <div class="currencyRow" v-for="entry in props2.pageItems">
                                <div class="xLeft yCenter"> {{ entry[1] }} {{ currenciesStore.getCurrencySymbol(entry[0]) }}</div>
                                <div class="xRight yCenter">{{ (getCurrencyValue(entry[0], entry[1]) as number).toFixed(2) }}</div>
                            </div>
                        </div>
                        <div class="xRight" v-if="props2.totalPages != 1">
                            <div class="pageSelector">
                                <fa-icon @click="props2.previous()" class="small" id="previousArrow" 
                                :class="{'disabled': !props2.isPreviousArrowAllowed}" icon="fa-solid fa-chevron-left"></fa-icon>
                                <h2 id="currentPageCurrency" class="graphPanelTitle variantTab">{{ props2.currentPage + 1 }}</h2>
                                <fa-icon @click="props2.next()" id="nextArrow" class="small"
                                :class="{'disabled': !props2.isNextArrowAllowed}" icon="fa-solid fa-chevron-right"></fa-icon>
                            </div>
                        </div>
                    </pagination>
                </div>
                <div style="height:fit-content;">
                    <div class="containerRow" v-for="container in props.pageItems">
                        <div class="xLeft yCenter">{{ container.name }}</div>
                        <div class="xRight yCenter">{{ container.value }} {{ currenciesStore.getBaseCurrencySymbol() }}</div>
                    </div>
                </div>
            </div>
        </grid-shortcut>
    </pagination>
</template>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';

#pagination
{
    .fullSize; .bg(@backgroundDark);
}

.separator 
{
    border-bottom: 1px solid gray;
}

#graphPanel
{
    .fullHeight; box-sizing: border-box;
    .pageSelector  { color:gray !important; transform: translateY(-3px); }
    #nextArrow, #previousArrow { margin:0px; display:inline; font-size:14px; cursor: pointer; }
    #nextArrow.small, #previousArrow.small { font-size:10px; }
    #currentPage { .horiMargin(15px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
    #currentPageCurrency { #currentPage; font-size:12px; .horiMargin(5px); }
    .disabled { pointer-events: none; opacity:0.2; }

    .graphPanelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }

    .containerRow
    {
        .fullSize; .xLeft; .yCenter; .leftRightGrid;
        font-size:14px;
    }

    .currencyRow
    {
        .leftRightGrid;
        .vertMargin(10px);
        font-size:14px;
    }
}
</style>

<script lang="ts">
import paginationVue from '@/modules/core/components/pagination.vue';
import numberPagination from '@/modules/core/components/numberPagination.vue';
import { defineComponent } from 'vue';
import { LineChart, type ExtractComponentData } from 'vue-chart-3';
import { Chart, registerables, type ChartOptions, type ChartData } from "chart.js";
import { useMainStore } from '@/modules/core/stores/store';
import { useContainersStore } from '../stores/useContainersStore';
import { useCurrenciesStore } from '../../currencies/stores/useCurrenciesStore';
Chart.register(...registerables);

export default defineComponent(
{
    components: { "pagination": paginationVue, "numberPagination": numberPagination },
    props: { "title": { default: "", type: String }, },
    setup()
    {
        let data = {};
        return data;
    },
    data()
    {
        let data = 
        { 
            store: useMainStore(), 
            containersStore: useContainersStore(),
            currenciesStore: useCurrenciesStore(),
            currentPage: 0
        };
        return data;
    },
    computed:
    {
        sortedContainers()
        {
            return this.store.toSorted(this.containersStore.containers.lastSuccessfulData?.rangeItems ?? [], (a,b) => parseFloat(b.value) - parseFloat(a.value));
        }
    },
    methods:
    {
        getCurrencyValue(id:string, amount:string)
        {   
            let currency = (this.currenciesStore.currencies.lastSuccessfulData?.rangeItems ?? []).find(x => x.id == id);
            if (currency == undefined) return 0;
            else return parseFloat(currency.rateToBase) * parseFloat(amount);
        },
        getContainerBalances(containerBalances: {[key: string]: string}): Array<[string, string]>
        {
            let sortingFunction = (x: [string,string], y: [string,string]) => 
            {
                return this.getCurrencyValue(y[0], y[1]) - this.getCurrencyValue(x[0], x[1])
            };
            return this.store.toSorted(Object.entries(containerBalances), sortingFunction);
        }
    }
});
</script>