<template>
    <grid-shortcut id="numbersPanel" style="padding:15px; box-sizing:border-box; height:100%; gap:15px;" columns="1fr" rows="auto 1fr">
        <grid-shortcut rows="1fr" columns="1fr auto">
            <h2 class="numbersPanelTitle">{{ title.get() }}</h2>
            <div class="pageSelector">
                <fa-icon @click="previousPage()" :class="{'disabled': !isPreviousArrowAllowed}" id="previousArrow" icon="fa-solid fa-chevron-left"></fa-icon>
                <h2 id="currentPage" class="numbersPanelTitle variantTab">{{ currentPageIndex + 1 }}</h2>
                <fa-icon @click="nextPage()" :class="{'disabled': !isNextArrowAllowed}" id="nextArrow" icon="fa-solid fa-chevron-right"></fa-icon>
            </div>
        </grid-shortcut>
        <grid-shortcut style="overflow: hidden; grid-auto-rows: 1fr;" columns="1fr">
            <NetworkCircularIndicator v-if="isLoading.get()||error.get()" :isLoading="isLoading.get()" :error="error.get()" class="fullHeight"/>
            <div v-else-if="currentViewItems.length == 0" class="fullSize center"> {{ noItemsText.get() }} </div>
            <div v-for="currentItem in currentViewItems">
                <slot name="row" :currentItem="currentItem"></slot>
            </div>
            <!-- Automatically add empty rows if the current page hasn't enough items -->
            <div v-if="currentViewItems.length > 0" v-for="blankRow in new Array(itemsInPage.get()! - currentViewItems.length)"></div>
        </grid-shortcut>
    </grid-shortcut>
</template> 

<script lang="ts" setup generic="T">
import NetworkCircularIndicator from '@/modules/core/components/networkCircularIndicator.vue';
import { computed, defineComponent, type PropType, ref } from 'vue';
import { defineProperty } from '../utils/defineProperty';

const props = withDefaults(defineProps<
{
    items?: T[],
    itemsInPage?: number,
    title?: string,
    noItemsText?: string,
    isLoading?: boolean,
    error?: object
}>(), 
{
    itemsInPage: 7,
    error: undefined,
    isLoading: true,
    items: () => [] as T[],
    title: "Title Here",
    noItemsText: "No Items"
});

const items = defineProperty<T[], 'items', typeof props>("items", { emitFunc: undefined, props: props, withEmits: false });
const itemsInPage = defineProperty<number, 'itemsInPage', typeof props>("itemsInPage", { emitFunc: undefined, props: props, withEmits: false });
const title = defineProperty<string, 'title', typeof props>("title", { emitFunc: undefined, props: props, withEmits: false });
const noItemsText = defineProperty<string, 'noItemsText', typeof props>("noItemsText", { emitFunc: undefined, props: props, withEmits: false });
const isLoading = defineProperty<boolean, 'isLoading', typeof props>("isLoading", { emitFunc: undefined, props: props, withEmits: false });
const error = defineProperty<object|undefined, 'error', typeof props>("error", { emitFunc: undefined, props: props, withEmits: false });

const currentPageIndex = ref(0);

const nextPage = () => currentPageIndex.value++;
const previousPage = () => currentPageIndex.value--;

const isPreviousArrowAllowed = computed(() => currentPageIndex.value > 0);
const isNextArrowAllowed = computed(() => 
{
    if (itemsInPage.get() === 0) return false;
    return currentPageIndex.value < Math.floor((items.get().length - 1) / itemsInPage.get()!);
});
const currentViewItems = computed(() => 
{
    if (items.get()!.length == 0) return [];
    if (items.get()!.length <= itemsInPage.get()!) return items.get();
    let lowerBoundIndex = currentPageIndex.value * itemsInPage.get()!;
    let upperBoundIndex = lowerBoundIndex + itemsInPage.get()!;
    if (upperBoundIndex >= items.get()!.length) upperBoundIndex = items.get()!.length - 1;
    return (items.get()).slice(lowerBoundIndex, upperBoundIndex);    
});

// components: { NetworkCircularIndicator },
//     props:
//     {
//         "items": { default: [], type: Object as PropType<T[]> },
//         "itemsInPage": { default:7, type:Number },
//         "title": { default: "Title", type: String },
//         "noItemsText": { default: '', type: String },
//         "isLoading": { default: true, type: Boolean },
//         "error": { default: undefined }
//     },
//     data() 
//     { 
//         let data = { page: 0 };
//         return data;
//     },
//     methods:
//     {
//         nextPage() { this.page++; },
//         previousPage() { this.page--; },
//     },
//     computed:
//     {
//         isPreviousArrowAllowed() { return this.page > 0; },
//         isNextArrowAllowed() { return this.itemsInPage == 0 ? false : this.page < Math.floor((this.items.length - 1) / this.itemsInPage); },
//         currentViewItems() 
//         {
//             if (this.items.length == 0) return [];
//             if (this.items.length <= this.itemsInPage) return this.items;
//             let lowerBoundIndex = this.page * this.itemsInPage;
//             let upperBoundIndex = lowerBoundIndex + this.itemsInPage;
//             if (upperBoundIndex >= this.items.length) upperBoundIndex = this.items.length - 1;
//             return this.items.slice(lowerBoundIndex, upperBoundIndex);
//         }
//     }

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