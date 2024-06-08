<template>
    <grid-shortcut id="numbersPanel" style="padding:15px; box-sizing:border-box; height:100%;" columns="1fr" rows="1fr 1fr">
        <grid-shortcut rows="1fr" columns="1fr auto">
            <h2 class="numbersPanelTitle">{{ title }}</h2>
            <div class="variantSelector">

                <h2 :class="{'selected': selectedVarient=='All'}" @click="selectedVarient = 'All'" 
                class="numbersPanelTitle variantTab" v-if="valueAll != undefined">All</h2>

                <h2 :class="{'selected': selectedVarient=='7d'}" @click="selectedVarient = '7d'" 
                class="numbersPanelTitle variantTab" v-if="value7d != undefined">7d</h2>

                <h2 :class="{'selected': selectedVarient=='30d'}" @click="selectedVarient = '30d'" 
                class="numbersPanelTitle variantTab" v-if="value30d != undefined">30d</h2>

            </div>
        </grid-shortcut>
        <div class="verticallyBottom">
            <h2 v-if="selectedVarient=='7d'" class="variantSelectorTab">$ {{ value7d?.toFixed(2) }}</h2>
            <h2 v-if="selectedVarient=='30d'" class="variantSelectorTab">$ {{ value30d?.toFixed(2) }}</h2>
            <h2 v-if="selectedVarient=='All'" class="variantSelectorTab">$ {{ valueAll?.toFixed(2) }}</h2>
        </div>
    </grid-shortcut>
</template>

<script lang="ts">
export default
{
    // props: []"value7d", "valueAll", "value30d", "title"],
    props:
    {
        "value7d": { default: undefined, type: Number },
        "value30d": { default: undefined, type: Number },
        "valueAll": { default: undefined, type: Number },
        "title": { default: "", type: String },
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
@import '@/stylesheets/globalStyle.less';
#numbersPanel
{
    .fullSize; .bg(@backgroundDark);
    // border-bottom: 2px solid v-bind(borderColor);
    // fade(@success, 20%)
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