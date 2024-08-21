<template>
    <cell :title="title">
        <div v-if="!isLoading && !networkError" class="fullHeight xLeft">
            <h2 class="variantSelectorTab">$ {{ currentValue?.toFixed(2) }}</h2>
        </div>
        <div v-else class="fullHeight">
            <NetworkCircularIndicator :error="networkError" :isLoading="isLoading" class="fullHeight"/>
        </div>
        <template #cellOptions>
            <variants-selector :availableOptions="availableOptions" v-model:selectedOption="selectedVarient"></variants-selector>
        </template>
    </cell>
</template>

<script lang="ts">
import { VProgressCircular } from 'vuetify/lib/components/index.mjs';
import NetworkCircularIndicator from '../components/networkCircularIndicator.vue';
import Cell from '@/modules/core/components/cell.vue';
import variantsSelectorVue from './variantsSelector.vue';

export default
{
    components: { VProgressCircular, NetworkCircularIndicator, Cell, "variants-selector": variantsSelectorVue },
    props:
    {
        "value7d": { default: undefined, type: Number },
        "value30d": { default: undefined, type: Number },
        "valueAll": { default: undefined, type: Number },
        "title": { default: "", type: String },
        "isLoading": { default: true, type: Boolean },
        "networkError": { default: undefined }
    },
    data() 
    { 
        let data = { selectedVarient: "30d" };
        return data;
    },
    methods:
    {
        checkDefault()
        {
            if (this.value7d != undefined && this.value30d == undefined && this.valueAll == undefined) this.selectedVarient = "7d";
            if (this.value7d == undefined && this.value30d != undefined && this.valueAll == undefined) this.selectedVarient = "30d";
            if (this.value7d == undefined && this.value30d == undefined && this.valueAll != undefined) this.selectedVarient = "All";
        }
    },
    computed:
    {
        availableOptions()
        {
            return [
                this.valueAll === undefined ? undefined : "All",
                this.value30d === undefined ? undefined : "30d",
                this.value7d === undefined ? undefined : "7d"
            ].filter(x => !!x) as string[];
        },

        /** The value of the currently selected tab */
        currentValue()
        {
            if (this.selectedVarient === 'All' && this.valueAll !== undefined) return this.valueAll;
            if (this.selectedVarient === '30d' && this.value30d !== undefined) return this.value30d;
            if (this.selectedVarient === '7d' && this.value7d !== undefined) return this.value7d;
            return undefined;
        }
    },
    mounted() { this.checkDefault(); },
    watch:
    {
        "value7d": function () { this.checkDefault(); },
        "value30d": function () { this.checkDefault(); },
        "valueAll": function () { this.checkDefault(); },
    }
}
</script>

<style lang="less" scoped>
@import '../stylesheets/globalStyle.less';
#numbersPanel
{
    .fullSize; .bg(@backgroundDark);
    box-sizing:border-box;

    .numbersPanelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
    .variantSelector
    {
        & > h2:nth-child(2) { margin-left:5px; }
        & > h2:nth-child(3) { margin-left:5px; }
        .variantTab { cursor: pointer; }
        .variantTab.selected { color:@focus;}
    }
    & /deep/ .variantSelectorTab
    {
        color:white; text-align:start; color:gray; font-size:26px;
        .tight;
    }
}
</style>