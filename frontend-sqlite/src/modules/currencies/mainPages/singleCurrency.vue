<template>
    <div id="currencyTopDiv">
        <div v-if="isCurrencyFound && targetCurrency" id="currencyTopDivInner">
            <div>
                <ViewTitle :title="`Currency - ${targetCurrency!.name}`"
                           hasBackButton @back="router.back()"/>
            </div>
            <div>
                <br /><br />
            </div>
            <CurrencyRatesHistoryCell style="height: 350px;" :currencyId="targetCurrency.id"/>
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
            <NetworkCircularIndicator isLoading :error="currency.error.value" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import router from '@/router';
import NetworkCircularIndicator from '@/modules/core/components/networkCircularIndicator.vue';
import { useNetworkRequest } from '@/modules/core/composables/useNetworkRequest';
import type { GetCurrencyAPI } from '../../../../../api-types/currencies';
import { API_CURRENCIES_PATH } from '@/apiPaths';
import StaticNotice from '@/modules/core/components/staticNotice.vue';
import ViewTitle from '@/modules/core/components/viewTitle.vue';
import CurrencyRatesHistoryCell from '../components/currencyRatesHistoryCell.vue';

const cid = computed(() => router.currentRoute.value.params['cid']);
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
    container-type: size;
    .fullSize;

    #currencyTopDivInner { padding: @desktopPagePadding; }
}
</style>