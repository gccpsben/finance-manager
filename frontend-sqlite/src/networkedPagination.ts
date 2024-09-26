import { ref, watch, computed, type Ref, watchEffect, toValue, type MaybeRef, toRef  } from "vue";

export type UpdaterReturnType<T> = 
{
    totalItems: number,
    startingIndex: number,
    endingIndex: number,
    rangeItems: T[]
};
export type Updater<T> = (start:number, count:number) => Promise<UpdaterReturnType<T>>

export type PaginationOverflowResolutionMethod = "TO_ZERO" | "TO_LAST";

export default function useNetworkPagination<T>
(
    args: 
    {
        updater: Updater<T>, 
        pageSize: MaybeRef<number>, 
        pageIndex: MaybeRef<number>,
        updateOnMount?: boolean,
        /** Overflow occurs when the external collection of items changes. For example the collections length decreases to max page 2 and this composable is still on page 5. */
        overflowResolutionMethod?: MaybeRef<PaginationOverflowResolutionMethod>
    }
)
{
    const overflowResolutionMethod = toRef(args.overflowResolutionMethod ?? "TO_LAST");
    const updateOnMount = toRef(args.updateOnMount ?? true);
    const pageSize = toRef(args.pageSize);
    const pageIndex = toRef(args.pageIndex);
    const pageItems = ref<T[]>([]) as Ref<T[]>;
    const totalItems = ref<number>(0);
    const isLoading = ref<boolean>(false);
    const viewportLowerBoundIndex = computed(() => { return pageIndex.value * pageSize.value });
    const viewportUpperBoundIndex = computed(() => { return (pageIndex.value + 1) * pageSize.value - 1});
    const maxPageIndex = computed(() => getMaxPageIndex());
    const hasPreviousPage = computed(() => pageIndex.value > 0);
    const hasNextPage = computed(() => pageIndex.value < getMaxPageIndex());
    const getMaxPageIndex = () => Math.floor((totalItems.value - 1) / pageSize.value);
    const latestFetchDateTime = ref<Date|undefined>(undefined);

    const fetchItems = async () => 
    {
        isLoading.value = true;
        const fetchTime = new Date();
        latestFetchDateTime.value = new Date();
        const fetchResult = await args.updater(pageIndex.value * pageSize.value, pageSize.value);
        if (fetchTime.getTime() < latestFetchDateTime.value.getTime()) // another fetch has finished before this one finishes
            return;
        pageItems.value = fetchResult.rangeItems;
        totalItems.value = fetchResult.totalItems;
        isLoading.value = false;

        if (pageIndex.value !== 0 && fetchResult.rangeItems.length === 0)
        {
            if (overflowResolutionMethod.value === 'TO_LAST') pageIndex.value = getMaxPageIndex();
            else if (overflowResolutionMethod.value === 'TO_ZERO') pageIndex.value = 0;
            await fetchItems();
        }
    };

    if (updateOnMount.value) fetchItems();

    watch(pageIndex, (newVal, oldVal) => 
    {
        if (newVal === oldVal) return;
        fetchItems();
    });

    return {
        pageItems,
        totalItems,
        isLoading,
        pageIndex,
        pageSize,
        viewportLowerBoundIndex,
        viewportUpperBoundIndex,
        hasNextPage,
        hasPreviousPage,
        refetch: fetchItems,
        maxPageIndex
    }
}