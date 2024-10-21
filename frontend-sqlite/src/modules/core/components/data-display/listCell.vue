<template>

    <cell :title="title.get()" :inset-mode="props.insetMode">
        <template #cellOptions>
            <div class="pageSelector">
                <numberPagination v-model="currentPageIndex" :min-page-readable="1"
                                  :max-page-readable="maxPageAllowed + 1" />
            </div>
        </template>
        <OverlapArea class="fullHeight">
            <NetworkCircularIndicator v-if="isLoading.get()||error.get()"
                                  :isLoading="isLoading.get()"
                                  :error="error.get()"/>
            <grid-shortcut :style="{opacity: isLoading.get() ? 0.5 : 1}" columns="1fr"
                           style="overflow: hidden; grid-auto-rows: 1fr;" class="fullSize">
                <div v-if="currentViewItems.length == 0 && !isLoading.get() && !error.get()" class="fullSize center">
                    {{ noItemsText.get() }}
                </div>
                <div v-for="currentItem in currentViewItems">
                    <slot name="row" :currentItem="currentItem"></slot>
                </div>
                <!-- Automatically add empty rows if the current page hasn't enough items -->
                <div v-if="currentViewItems.length > 0"
                     v-for="blankRow in new Array(itemsInPage.get()! - currentViewItems.length)"></div>
            </grid-shortcut>
        </OverlapArea>
    </cell>

</template>

<script lang="ts" setup generic="T">
import NetworkCircularIndicator from '@/modules/core/components/data-display/networkCircularIndicator.vue';
import { computed, ref } from 'vue';
import { defineProperty } from '@/modules/core/utils/defineProperty';
import cell from '@/modules/core/components/data-display/cell.vue';
import numberPagination from '@/modules/core/components/data-display/numberPagination.vue';
import OverlapArea from '@/modules/core/components/layout/overlapArea.vue';

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

const items = defineProperty<T[], 'items', typeof props>("items", { default: [], emitFunc: undefined, props: props });
const itemsInPage = defineProperty<number, 'itemsInPage', typeof props>("itemsInPage", { default: 7, emitFunc: undefined, props: props });
const title = defineProperty<string, 'title', typeof props>("title", { default: "Title Here", emitFunc: undefined, props: props });
const noItemsText = defineProperty<string, 'noItemsText', typeof props>("noItemsText", { default: "No Items", emitFunc: undefined, props: props });
const isLoading = defineProperty<boolean, 'isLoading', typeof props>("isLoading", { default: true, emitFunc: undefined, props: props });
const error = defineProperty<object|undefined, 'error', typeof props>("error", { default: undefined, emitFunc: undefined, props: props });
const currentPageIndex = ref(0);
const maxPageAllowed = computed(() => Math.floor((items.get().length - 1) / itemsInPage.get()!));
const currentViewItems = computed(() =>
{
    if (items.get()!.length == 0) return [];
    if (items.get()!.length <= itemsInPage.get()!) return items.get();
    let lowerBoundIndex = currentPageIndex.value * itemsInPage.get()!;
    let upperBoundIndex = lowerBoundIndex + itemsInPage.get()!;
    if (upperBoundIndex >= items.get()!.length) upperBoundIndex = items.get()!.length;
    return (items.get()).slice(lowerBoundIndex, upperBoundIndex);
});
</script>