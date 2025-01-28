<template>
    <div id="currencyTopDiv">
        <div v-if="currencyObj[0] === 'OK' && currencyObj[1]" id="currencyTopDivInner">
            <div>
                <ViewTitle :title="`${currencyObj[1].name}`"
                           hasBackButton @back="router.back()"/>
            </div>
            <div><br /><br /></div>
            <div class="pageContent">
                <div class="summaryBar">
                    <div class="xLeft">Latest Price</div>
                    <div class="summaryBarColumns">
                        <div class="xLeft">
                            <h3 style="font-size: 36px;">
                                <template v-if="latestPrice[0] === 'ERROR' || latestPrice[0] === 'LOADING'">
                                    <NetworkCircularIndicator :error="requestError" :is-loading="true"/>
                                </template>
                                <template v-else>
                                    {{ latestPrice[1] === null ? " - " : `$ ${latestPrice[1]}` }}
                                </template>
                            </h3>
                        </div>
                        <div class="summaryBarColumn">
                            <div class="xLeft">
                                <div>Sources Defined</div>
                            </div>
                            <strong class="xLeft">4</strong>
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; grid-auto-flow: auto;">
                    <div class="xLeft">
                        <h3>Price History</h3>
                    </div>
                    <div>
                        <br />
                        <template v-if="currencyRatesHistoryFull[0] === 'ERROR' || currencyRatesHistoryZoomed[0] === 'ERROR'">
                            Error getting the datums
                        </template>
                        <template v-else>
                            <OverlapArea class="fullSize">
                                <div>
                                    <ZoomableLineChart :whole-datums="currencyRatesHistoryFull[0] === 'LOADING' ? [] : currencyRatesHistoryFull[1]"
                                           :is-x-axis-epoch="true" v-model:range-start="rangeStart" v-model:range-end="rangeEnd"
                                           style="height: 400px" @slider-end="handle.trigger()"
                                           :zoomed-datums="currencyRatesHistoryZoomed[0] === 'LOADING' ? [] : currencyRatesHistoryZoomed[1]"/>
                                </div>
                                <div v-if="isAnyRequestLoading">
                                    <NetworkCircularIndicator :error="requestError" :is-loading="isAnyRequestLoading"/>
                                </div>
                            </OverlapArea>
                        </template>
                    </div>
                </div>
            </div>
        </div>
        <div v-else-if="currencyObj[1] === null"
             style="height: 100svh;" class="center">
            <StaticNotice type="ERR">
                <div>
                    Cannot find the currency requested.
                    <br /> Please check your URL.
                </div>
            </StaticNotice>
        </div>
        <div v-else class="center" style="height: 100svh;">
            <NetworkCircularIndicator isLoading :error="currencyObj[1]"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import router from '@/router';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetCurrencyAPI } from '@/modules/../../../api-types/currencies';
import { API_CURRENCIES_PATH } from '@/apiPaths';
import StaticNotice from '@/modules/core/components/data-display/StaticNotice.vue';
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import { rateHistoryToDateValueList, useCurrencyRatesHistory } from '@/modules/currencies/composables/useCurrencyRatesHistory';
import ZoomableLineChart from '@/modules/core/components/data-display/ZoomableLineChart.vue';
import { watchTriggerable } from '@vueuse/core';
import OverlapArea from '@/modules/core/components/layout/OverlapArea.vue';

type LoadingOrError<T> = ['OK', T] | ['LOADING'] | ['ERROR', unknown];

const currencyRatesHistoryZoomed = ref<LoadingOrError<{x: number, y: number}[]>>(['LOADING']);
const currencyRatesHistoryFull = ref<LoadingOrError<{x: number, y: number}[]>>(['LOADING']);
const currencyObj = ref<LoadingOrError<GetCurrencyAPI.ResponseDTO['rangeItems'][0] | null>>(['LOADING']);
const isAnyRequestLoading = computed(() => currencyRatesHistoryFull.value[0] === 'LOADING' || currencyRatesHistoryZoomed.value[0] === 'LOADING');
const requestError = computed(() => {
    if (currencyRatesHistoryFull.value[0] !== 'ERROR' && currencyRatesHistoryZoomed.value[0] !== 'ERROR')
        return undefined;
    return `${currencyRatesHistoryFull.value[1] || currencyRatesHistoryZoomed.value[1]}`;
});

const cid = computed(() => `${router.currentRoute.value.params['cid']}`);
const rangeStart = ref(0);
const rangeEnd = ref(100);

// Load currency data when needed
watch(cid, async () =>
{
    const currencyReq = useNetworkRequest<GetCurrencyAPI.ResponseDTO>(
    {
        url: API_CURRENCIES_PATH, method: "GET",
        query: { id: `${cid.value}` }
    }, { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: false });
    await currencyReq.updateData();

    if (currencyReq.error.value) return currencyObj.value = ['ERROR', currencyReq.error.value];
    currencyObj.value = ['OK', currencyReq.lastSuccessfulData.value!.rangeItems[0] ?? null];
}, { immediate: true });

// Update full history if needed
watch(currencyObj, async () =>
{
    currencyRatesHistoryFull.value = ['LOADING'];
    currencyRatesHistoryZoomed.value = ['LOADING'];
    const historyReq = useCurrencyRatesHistory(cid, undefined, undefined, false);
    await historyReq.update();
    if (historyReq.networkRequest.error.value) return currencyRatesHistoryFull.value = ['ERROR', historyReq.networkRequest.error.value];
    currencyRatesHistoryFull.value = ['OK', rateHistoryToDateValueList(historyReq.lastSuccessfulData.value!.datums)];
});

// Update zoomed history if needed
const handle = watchTriggerable(() => [currencyObj.value, currencyRatesHistoryFull.value], async () =>
{
    currencyRatesHistoryZoomed.value = ['LOADING'];
    if (currencyRatesHistoryFull.value[0] === 'LOADING' || currencyRatesHistoryFull.value[0] === 'ERROR') return;

    const fullHistoryStart = minMaxOrUndefined('MIN', currencyRatesHistoryFull.value[1]);
    const fullHistoryEnd = minMaxOrUndefined('MAX', currencyRatesHistoryFull.value[1]);
    if (fullHistoryEnd === undefined || fullHistoryStart === undefined) return;
    const range = fullHistoryEnd - fullHistoryStart;
    const reqStartTime = Math.round(fullHistoryStart + (range * rangeStart.value / 100));
    const reqEndTime = Math.round(fullHistoryStart + (range * rangeEnd.value / 100));

    const historyReq = useCurrencyRatesHistory(cid, reqStartTime, reqEndTime, false);
    await historyReq.update();
    if (historyReq.networkRequest.error.value) return currencyRatesHistoryZoomed.value = ['ERROR', historyReq.networkRequest.error.value];
    currencyRatesHistoryZoomed.value = ['OK', rateHistoryToDateValueList(historyReq.lastSuccessfulData.value!.datums)];
});

const latestPrice = computed<LoadingOrError<number | null>>(() =>
{
    if (isAnyRequestLoading.value) return ['LOADING'];
    if (requestError.value) return ['ERROR', requestError.value]
    if (currencyRatesHistoryFull.value[0] !== 'OK') return ['OK', null];
    const history = currencyRatesHistoryFull.value[1];
    if (history.length === 0) return ['OK', null];
    return ['OK', Math.round(history[history.length - 1].y)];
});

function minMaxOrUndefined(mode: 'MIN' | 'MAX' ,datums: Readonly<{ x: number; y: number; }[]> | null | undefined)
{
    if (datums === null || datums === undefined || datums.length === 0) return undefined;
    const method = mode === 'MAX' ? Math.max : Math.min;
    return method(...datums.map(x => x.x));
}
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
* { box-sizing: border-box; };

#currencyTopDiv
{
    container-name: currencyPage;
    container-type: inline-size;
    .fullSize;
    font-family: @font;
    color: @foreground;
    overflow: scroll;
    overflow-x: hidden;

    .rateSrcsTable { font-size: 14px; }

    #currencyTopDivInner
    {
        padding: @desktopPagePadding;

        .pageContent
        {
            display: grid;
            gap: 24px;

            .summaryBar
            {
                display: grid;
                grid-template-rows: auto auto;
                border-bottom: 1px solid #333;
                padding-bottom: 14px;

                .summaryBarColumns
                {
                    display: grid;
                    grid-template-rows: 1fr;
                    grid-auto-columns: auto;
                    grid-auto-flow: column;

                    .summaryBarColumn
                    {
                        border-left: 1px solid #333; display: grid; grid-template-rows: min-content auto; padding-left: 18px;
                    }
                }
            }
        }
    }
}

@container currencyPage (width <= 1000px)
{
    #currencyTopDivInner
    {
        padding: @mobilePagePadding !important;
        .pageContent
        {
            grid-template-columns: 1fr !important;
            grid-template-rows: 1fr 1fr !important;
            grid-template-areas: 'history' 'srcs' !important;
        }
    }
}
</style>