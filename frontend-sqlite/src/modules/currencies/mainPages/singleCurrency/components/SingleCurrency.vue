<template>
    <div id="currencyTopDiv">
        <div v-if="isCurrencyFound && targetCurrency" id="currencyTopDivInner">
            <div><ViewTitle :title="`${targetCurrency!.name}`" hasBackButton @back="router.back()"/></div>
            <div><br /><br /></div>
            <div class="pageContent">
                <CurrencyRatesHistoryCell style="height: 350px;" :currencyId="targetCurrency.id" v-area="'history'"/>
                <RateAPISourcesCell :currency-id="cid" :is-base-currency="targetCurrency.isBase"/>
            </div>
        </div>
        <div v-else-if="currency.lastSuccessfulData.value?.totalItems === 0" style="height: 100svh;" class="center">
            <StaticNotice type="ERR">
                <div>
                    Cannot find the currency requested.
                    <br /> Please check your URL.
                </div>
            </StaticNotice>
        </div>
        <div v-else class="center" style="height: 100svh;">
            <NetworkCircularIndicator isLoading :error="currency.error.value"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import router from '@/router';
import NetworkCircularIndicator from '@/modules/core/components/data-display/NetworkCircularIndicator.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetCurrencyAPI } from '@/modules/../../../api-types/currencies';
import { API_CURRENCIES_PATH } from '@/apiPaths';
import StaticNotice from '@/modules/core/components/data-display/StaticNotice.vue';
import ViewTitle from '@/modules/core/components/data-display/ViewTitle.vue';
import CurrencyRatesHistoryCell from '@/modules/currencies/components/CurrencyRatesHistoryCell.vue';
import RateAPISourcesCell from './RateAPISourcesCell.vue';

const cid = computed(() => `${router.currentRoute.value.params['cid']}`);
const currency = useNetworkRequest<GetCurrencyAPI.ResponseDTO>(
{
    url: API_CURRENCIES_PATH,
    query: { id: `${cid.value}` },
    method: "GET",
    body: {  }
}, { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: false });
currency.updateData();

const isCurrencyFound = computed(() => !currency.isLoading.value && currency.lastSuccessfulData.value?.totalItems === 1);
const targetCurrency = computed(() => currency.lastSuccessfulData.value?.rangeItems[0]);
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
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            grid-template-areas: 'history srcs' '_ _';
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