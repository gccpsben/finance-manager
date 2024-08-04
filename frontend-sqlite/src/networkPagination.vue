<template>
    <div>

        <!-- To bind to currentPage, use v-model:currentPage="..." instead. -->
        <slot :totalPages="totalPages"
        :next="next" :pageItems="pageItems"
        :previous="previous" :bounds="currentBounds"
        :currentPage="computedPage" :totalItems="totalItems"
        :isPreviousArrowAllowed="isPreviousArrowAllowed" 
        :isNextArrowAllowed="isNextArrowAllowed"
        :isLoading="isLoading"></slot>

    </div>
</template>

<script lang="ts">
export default
{
    props:
    {
        "totalItems": Number,
        "itemsInPage": { default: 10, type: Number },
        "initialItems": { default: 10, type: Number },
        "currentPage": { default: undefined, type: Number },
        "updator": Function
    },
    data() 
    { 
        let data = 
        { 
            innerPage: 0, 
            allItems: [] as Array<any>, 
            pageItems: [] as Array<any>,
            isLoading: false
        } 
        return data;
    },
    methods:
    {
        setPage(page:number) 
        {
            if (this.currentPage != undefined) this.$emit("update:currentPage", page); 
            else { this.innerPage = page; }
        },
        next() { if (this.isNextArrowAllowed) this.setPage(this.computedPage + 1); },
        previous() { if (this.isPreviousArrowAllowed) this.setPage(this.computedPage - 1); },
        getBounds(page:number, allItems?:number)
        {
            return {lower: page * (allItems ?? this.itemsInPage), upper: (1 + page) * (allItems ?? this.itemsInPage)}
        },
        async fetchAndReplace(start:number, end:number)
        {
            if (this.updator === undefined) return;
            this.isLoading = true;
            let results = await this.updator(start, end - start);
            for (let i = 0; i < results.length; i++) this.allItems[start + i] = results[i];
            this.isLoading = false;
        },
        async switchPage(page:number)
        {
            if (this.allItems.length == 0) return;
            if (this.updator === undefined) return;
            if (this.computedPage === undefined) return;
            let bins = partition<any>(this.allItems, this.itemsInPage);
            let currentBin = bins[this.computedPage];
            let hasNull = count(currentBin, x => x == null) > 0;
            let bounds = this.getBounds(page);
            if (hasNull) await this.fetchAndReplace(bounds.lower, bounds.upper);
            this.pageItems = this.allItems.slice(bounds.lower, bounds.upper);
        }
    },
    computed:
    {
        computedPage() : number { return this.currentPage || this.innerPage || 0; },
        totalPages() { return Math.ceil(this.allItems.length / this.itemsInPage); },
        isPreviousArrowAllowed() { return this.computedPage > 0; },
        isNextArrowAllowed() { return this.itemsInPage == 0 ? false : this.computedPage < Math.floor((this.allItems.length - 1) / this.itemsInPage); },
        currentBounds() { return this.getBounds(this.computedPage); }
    },
    watch:
    {
        totalItems: 
        {
            immediate: true,
            handler: async function () 
            {
                if (this.totalItems === undefined) return;
                this.allItems = new Array(this.totalItems);
                for (let i = 0; i < this.totalItems; i++)  this.allItems[i] = null;
                await this.fetchAndReplace(0, this.initialItems);
                this.switchPage(0);
            },
        },
        computedPage: 
        {
            immediate: true,
            handler: async function (newValue:number) 
            {

                this.switchPage(newValue); 
            },
        }
    },
    mounted()
    {
        this.switchPage(0);
    }
}

function count<T>(array:T[], predicate: (item:T, itemIndex: number) => boolean): number
{
    let output = 0;
    for (let i = 0; i < array.length; i++) if (predicate(array[i], i)) output++;
    return output;
}

function partition<T>(array:T[], itemsCount: number, skipLastBatch = false)
{
    let output: Array<Array<T>> = [];
    let temp: Array<T> = [];
    for (let i = 0; i < array.length; i++)
    {
        temp.push(array[i]);
        if (temp.length >= itemsCount) 
        {
            output.push([...temp]);
            temp = [];
        }
        if (i == array.length - 1 && !skipLastBatch) output.push(temp);
    }
    return output;
}
</script>