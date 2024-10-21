<template>
    <div>
        <!-- To bind to currentPage, use v-model:currentPage="..." instead. -->
        <slot :pageItems="currentViewItems"
        :totalPages="totalPages"
        :next="next"
        :previous="previous"
        :currentPage="computedPage"
        :isPreviousArrowAllowed="isPreviousArrowAllowed"
        :isNextArrowAllowed="isNextArrowAllowed"></slot>
    </div>
</template>

<style lang="less" scoped>

</style>

<script setup lang="ts" generic="T">
defineProps(
{
    items: {
        // @ts-ignore
        type: Array<T>,
        default: []
    },
    itemsInPage: {
        type: Number,
        default: 7
    },
    currentPage: {
        type: Number,
        default: undefined
    }
});
</script>


<script lang="ts">
export default
{
    data() { return { innerPage: 0 } },
    methods:
    {
        setPage(page:number)
        {
            if (this.currentPage != undefined) this.$emit("update:currentPage", page);
            else { this.innerPage = page; }
        },
        next()
        {
            if (this.isNextArrowAllowed) this.setPage(this.computedPage + 1);
        },
        previous()
        {
            if (this.isPreviousArrowAllowed) this.setPage(this.computedPage - 1);
        },
    },
    computed:
    {
        computedPage() : number { return this.currentPage || this.innerPage || 0; },
        totalPages() { return Math.ceil(this.items.length / this.itemsInPage); },
        isPreviousArrowAllowed() { return this.computedPage > 0; },
        isNextArrowAllowed() { return this.itemsInPage == 0 ? false : this.computedPage < Math.floor((this.items.length - 1) / this.itemsInPage); },
        currentViewItems()
        {
            if (this.computedPage < 0) return [];
            if (this.items.length <= this.itemsInPage) return this.items;
            var lowerBoundIndex = this.computedPage * this.itemsInPage;
            var upperBoundIndex = lowerBoundIndex + this.itemsInPage;
            if (upperBoundIndex >= this.items.length) upperBoundIndex = this.items.length;
            return this.items.slice(lowerBoundIndex, upperBoundIndex);
        }
    }
}
</script>
