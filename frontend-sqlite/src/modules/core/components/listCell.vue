<template>
    <grid-shortcut id="numbersPanel" style="padding:15px; box-sizing:border-box; height:100%; gap:15px;" columns="1fr" rows="auto 1fr">
        <grid-shortcut rows="1fr" columns="1fr auto">
            <h2 class="numbersPanelTitle">{{ title }}</h2>
            <div class="pageSelector">
                <fa-icon @click="previousPage()" :class="{'disabled': !isPreviousArrowAllowed}" id="previousArrow" icon="fa-solid fa-chevron-left"></fa-icon>
                <h2 id="currentPage" class="numbersPanelTitle variantTab">{{ page + 1 }}</h2>
                <fa-icon @click="nextPage()" :class="{'disabled': !isNextArrowAllowed}" id="nextArrow" icon="fa-solid fa-chevron-right"></fa-icon>
            </div>
        </grid-shortcut>
        <grid-shortcut style="overflow: hidden; grid-auto-rows: 1fr;" columns="1fr">
            <NetworkCircularIndicator v-if="isLoading||error" :isLoading="isLoading" :error="error" class="fullHeight"/>
            <div v-else-if="currentViewItems.length == 0" class="fullSize center"> {{ noItemsText }} </div>
            <div v-else v-for="currentItem in currentViewItems"><slot name="row" :currentItem="currentItem"></slot></div>
            <!-- Automatically add empty rows if the current page hasn't enough items -->
            <div v-if="currentViewItems.length > 0" v-for="blankRow in new Array(itemsInPage - currentViewItems.length)"></div>
        </grid-shortcut>
    </grid-shortcut>
</template>

<script lang="ts">
import NetworkCircularIndicator from '../networkCircularIndicator.vue';

export default
{
    components: { NetworkCircularIndicator },
    props:
    {
        "items": { default: [], type: Array<any> },
        "itemsInPage": { default:7, type:Number },
        "title": { default: "Title", type: String },
        "noItemsText": { default: '', type: String },
        "isLoading": { default: true, type: Boolean },
        "error": { default: undefined }
    },
    data() 
    { 
        let data = { page: 0 };
        return data;
    },
    methods:
    {
        nextPage() { this.page++; },
        previousPage() { this.page--; },
    },
    computed:
    {
        isPreviousArrowAllowed() { return this.page > 0; },
        isNextArrowAllowed() { return this.itemsInPage == 0 ? false : this.page < Math.floor((this.items.length - 1) / this.itemsInPage); },
        currentViewItems() 
        {
            if (this.items.length == 0) return [];
            if (this.items.length <= this.itemsInPage) return this.items;
            let lowerBoundIndex = this.page * this.itemsInPage;
            let upperBoundIndex = lowerBoundIndex + this.itemsInPage;
            if (upperBoundIndex >= this.items.length) upperBoundIndex = this.items.length - 1;
            return this.items.slice(lowerBoundIndex, upperBoundIndex);
        }
    }
}
</script>

<style lang="less" scoped>
@import '@/modules/core/stylesheets/globalStyle.less';
#numbersPanel
{
    .fullSize; .bg(@backgroundDark);
    // border-bottom: 2px solid v-bind(borderColor);
    // fade(@success, 20%)
    box-sizing:border-box;

    .pageSelector  { color:gray !important; transform: translateY(-3px); }
    #nextArrow, #previousArrow 
    { 
        margin:0px; display:inline; font-size:14px; cursor: pointer; 
        &:hover { color: @focus; }
    }
    #currentPage { .horiMargin(15px); font-size:16px; min-width:15px; display:inline-block; text-align: center; }
    .disabled { pointer-events: none; opacity:0.2; }

    .numbersPanelTitle { text-align:start; color:gray; font-size:14px; .tight; display:inline; }
    // & /deep/ .variantSelectorTab
    // {
    //     color:white; text-align:start; color:gray; font-size:26px;
    //     .tight;
    // }
}
</style>