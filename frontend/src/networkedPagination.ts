import { toValue } from "@vueuse/core";
import { ref, watch, computed, type Ref, watchEffect  } from "vue";
import { defineComponent } from 'vue'

export type updatorReturnType = 
{
    totalItems: number,
    startingIndex: number,
    endingIndex: number,
    rangeItems: any[]
};
export type updator = (start:number, count:number)=> Promise<updatorReturnType>

// interface Args
// {
//     updator: updator, 
//     totalItems: number, 
//     itemsInPage: number, 
//     initialPageIndex: number
// }

export default function useNetworkPagination
(
    updator: updator, 
    totalItems: Ref<number>, 
    itemsInPage: Ref<number>, 
    initialPageIndex: Ref<number>,
    initialItems?: Ref<number>
)
{
    // let prefill = (amount:number) => 
    // {
    //     let output = new Array(amount);
    //     for (let i = 0; i < amount; i++) output[i] = null; 
    //     return output;
    // };

    let isLoading = ref(false);
    let pageIndex = ref(initialPageIndex);
    let totalPages = computed(() => { return Math.ceil(allItems.value.length / toValue(itemsInPage)) });
    let currentPageItems = ref([] as any[]);
    let allItems = ref(new Array(toValue(totalItems) ?? 0));
    let next = function () { if (pageIndex.value < totalPages.value - 1) pageIndex.value++; };
    let previous = function () { if (pageIndex.value > 0) pageIndex.value--; };
    let viewportLowerBoundIndex = computed(() => { return pageIndex.value * toValue(itemsInPage) });
    let viewportUpperBoundIndex = computed(() => { return (pageIndex.value + 1) * toValue(itemsInPage) - 1});
    let updateView = function (start?:number, end?:number)
    { 
        let lower = start ?? viewportLowerBoundIndex.value;
        let upper = end ?? viewportUpperBoundIndex.value;
        if (lower == upper) currentPageItems.value = [];
        else currentPageItems.value = allItems.value.slice(lower, upper + 1).filter(x => x !== undefined); 
    }
    let fetchAndReplace = async function (start:number, end:number) 
    {
        isLoading.value = true;
        let updatorResponse = await updator(start, end - start) as updatorReturnType;
        let rangeItems = updatorResponse.rangeItems;

        for (let i = updatorResponse.startingIndex; i < updatorResponse.endingIndex; i++)
        {
            allItems.value[i] = rangeItems[i - start]
        }
        isLoading.value = false;

        if (totalItems.value != updatorResponse.totalItems)
        {
            resetCache();
            totalItems.value = updatorResponse.totalItems;
        }
    };
    let resetCache = function () 
    { 
        updateView();
        fetchAndReplace(0, itemsInPage.value);
        pageIndex.value = 0;
    };


    watchEffect(() => 
    {
        // watch(totalItems, () => { alert(); });
        let initialItemsToFetch = toValue(initialItems) ?? toValue(itemsInPage);

        let isFetchingNeeded = function (start:number, end:number) 
        {
            for (let i = start; i < end; i++) if (allItems.value[i] == null) return true;
            return false;
        };

        watch(totalItems, async () => 
        {
            allItems.value = new Array(toValue(totalItems) ?? 0); 
            if (isFetchingNeeded(viewportLowerBoundIndex.value, viewportUpperBoundIndex.value))
            {
                await fetchAndReplace(viewportLowerBoundIndex.value, viewportUpperBoundIndex.value + 1);
            }
            updateView();
        });
        
        watch(pageIndex, async () => 
        {
            if (isFetchingNeeded(viewportLowerBoundIndex.value, viewportUpperBoundIndex.value))
            {
                await fetchAndReplace(viewportLowerBoundIndex.value, viewportUpperBoundIndex.value + 1);
            }
            updateView();
        });

        setTimeout(async () => 
        { 
            await fetchAndReplace(0, Math.max(toValue(totalItems) ?? 0, toValue(initialItemsToFetch)));
            // updateView(0, Math.min(toValue(totalItems) ?? 0, toValue(initialItemsToFetch)) - 1);
        }); 
    });

    let returnData = 
    {
        allItems: allItems,
        isLoading: isLoading,
        pageIndex: pageIndex,
        totalPages: totalPages,
        currentPageItems: currentPageItems,
        next: next, previous: previous,
        lowerBoundIndex: viewportLowerBoundIndex,
        upperBoundIndex: viewportUpperBoundIndex,
        resetCache: resetCache,
        totalItems: totalItems
    };
    return returnData;
}
