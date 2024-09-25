<template>

    <cell :title="title.get()" :inset-mode="props.insetMode">
        <template #cellOptions>
            <div class="pageSelector">
                <numberPagination v-model="currentPageIndex" :min-page-readable="1" 
                                  :max-page-readable="maxPageAllowed + 1" />
            </div>
        </template>
        <grid-shortcut style="overflow: hidden; grid-auto-rows: 1fr;" columns="1fr" class="fullSize">
            <NetworkCircularIndicator v-if="isLoading.get()||error.get()" 
                                      :isLoading="isLoading.get()" 
                                      :error="error.get()" 
                                      class="fullHeight"
            />
            <div v-else-if="currentViewItems.length == 0" class="fullSize center"> 
                {{ noItemsText.get() }} 
            </div>
            <div v-for="currentItem in currentViewItems">
                <slot name="row" :currentItem="currentItem"></slot>
            </div>
            <!-- Automatically add empty rows if the current page hasn't enough items -->
            <div v-if="currentViewItems.length > 0" v-for="blankRow in new Array(itemsInPage.get()! - currentViewItems.length)">

            </div>
        </grid-shortcut>
    </cell>

</template> 

<script lang="ts" setup generic="T">
import NetworkCircularIndicator from '@/modules/core/components/networkCircularIndicator.vue';
import { computed, ref } from 'vue';
import { defineProperty } from '../utils/defineProperty';
import cell from '@/modules/core/components/cell.vue';
import numberPagination from '@/modules/core/components/numberPagination.vue';

const props = withDefaults(defineProps<
{
    items?: T[],
    itemsInPage?: number,
    title?: string,
    noItemsText?: string,
    isLoading?: boolean,
    error?: object,
    insetMode?: boolean
}>(), 
{
    itemsInPage: 7,
    error: undefined,
    isLoading: true,
    items: () => [] as T[],
    title: "Title Here",
    noItemsText: "No Items",
    insetMode: false
});

const items = defineProperty<T[], 'items', typeof props>("items", { emitFunc: undefined, props: props, withEmits: false });
const itemsInPage = defineProperty<number, 'itemsInPage', typeof props>("itemsInPage", { emitFunc: undefined, props: props, withEmits: false });
const title = defineProperty<string, 'title', typeof props>("title", { emitFunc: undefined, props: props, withEmits: false });
const noItemsText = defineProperty<string, 'noItemsText', typeof props>("noItemsText", { emitFunc: undefined, props: props, withEmits: false });
const isLoading = defineProperty<boolean, 'isLoading', typeof props>("isLoading", { emitFunc: undefined, props: props, withEmits: false });
const error = defineProperty<object|undefined, 'error', typeof props>("error", { emitFunc: undefined, props: props, withEmits: false });
const currentPageIndex = ref(0);
const maxPageAllowed = computed(() => Math.floor((items.get().length - 1) / itemsInPage.get()!));
const currentViewItems = computed(() => 
{
    if (items.get()!.length == 0) return [];
    if (items.get()!.length <= itemsInPage.get()!) return items.get();
    let lowerBoundIndex = currentPageIndex.value * itemsInPage.get()!;
    let upperBoundIndex = lowerBoundIndex + itemsInPage.get()!;
    if (upperBoundIndex >= items.get()!.length) upperBoundIndex = items.get()!.length - 1;
    return (items.get()).slice(lowerBoundIndex, upperBoundIndex);    
});
</script>