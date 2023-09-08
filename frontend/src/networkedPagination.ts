import { toValue } from "@vueuse/core";
import { ref, watch, computed, type Ref, watchEffect  } from "vue";
import { defineComponent } from 'vue'

type updator = (start:number, count:number)=>Promise<Array<any>>

interface Args
{
    updator: updator, 
    totalItems: number, 
    itemsInPage: number, 
    initialPageIndex: number
}

export default function useNetworkPagination
(
    updator: updator, 
    totalItems: Ref<number>, 
    itemsInPage: Ref<number>, 
    initialPageIndex: Ref<number>,
    initialItems?: Ref<number>
)
{
    let prefill = (amount:number) => 
    {
        let output = ref(new Array(amount));
        for (let i = 0; i < amount; i++) output.value[i] = null; 
        return output;
    };

    let isLoading = ref(false);
    let pageIndex = ref(initialPageIndex);
    let totalPages = computed(() => { return Math.ceil(allItems.value.length / toValue(itemsInPage)) });
    let currentPageItems = ref([] as any[]);
    let allItems = prefill(toValue(totalItems) ?? ref(0));
    let next = function () { if (pageIndex.value < totalPages.value - 1) pageIndex.value++; };
    let previous = function () { if (pageIndex.value > 0) pageIndex.value--; };
    let viewportLowerBoundIndex = computed(() => { return pageIndex.value * toValue(itemsInPage) });
    let viewportUpperBoundIndex = computed(() => { return (pageIndex.value + 1) * toValue(itemsInPage) - 1});

    watchEffect(() => 
    {
        watch(totalItems, () => { alert(); });
        let initialItemsToFetch = toValue(initialItems) ?? toValue(itemsInPage);

        let isFetchingNeeded = function (start:number, end:number) 
        {
            for (let i = start; i < end; i++) if (allItems.value[i] == null) return true;
            return false;
        };

        let fetchAndReplace = async function (start:number, end:number) 
        {
            isLoading.value = true;
            let fetchedItems = await updator(start, end - start);
            for (let i = start; i < end; i++)
            {
                allItems.value[i] = fetchedItems[i - start]
            }
            isLoading.value = false;
        };

        // watch(totalItems, () => 
        // {
        //     console.log("totalitems changed"); 
        //     allItems = prefill(toValue(totalItems) ?? 0); 
        // });

        let updateView = function (start?:number, end?:number)
        { 
            let lower = start ?? viewportLowerBoundIndex.value;
            let upper = end ?? viewportUpperBoundIndex.value;
            currentPageItems.value = allItems.value.slice(lower, upper + 1); 
        }

        
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
            await fetchAndReplace(0, Math.min(toValue(totalItems) ?? 0, toValue(initialItemsToFetch)));
            updateView(0, Math.min(toValue(totalItems) ?? 0, toValue(initialItemsToFetch)) - 1);
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
        upperBoundIndex: viewportUpperBoundIndex
    };
    return returnData;
}
