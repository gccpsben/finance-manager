import { isRef, isReadonly } from "vue";
import { onMounted } from "vue";
import { readonly } from "vue";
import type { MaybeRefOrGetter } from "vue";
import { ref, watch, computed, toValue, toRef  } from "vue";

export type UpdaterReturnType<T> = 
{
    totalItems: number,
    startingIndex: number,
    endingIndex: number,
    rangeItems: T[]
};

export type Updater<T> = (start:number, count:number) => Promise<UpdaterReturnType<T>>

export type PaginationOverflowHandler = (currentInvalidPageIndex: number, lastAvailablePageIndex: number) => void; 

export default function useNetworkPaginationNew<T>
(
    args:
    {
        /** updater is not expected to change after the initialization stage */
        updater: Updater<T>,
        pageSize: MaybeRefOrGetter<number>,
        pageIndex: MaybeRefOrGetter<number>,
        updateOnMount?: MaybeRefOrGetter<boolean>,

        /**
         * Overflow occurs when the external collection of items changes.
         * For example the amount of items in the database decreases to max page 2 and this composable is still on page 5. 
         */
        overflowResolutionHandler?: PaginationOverflowHandler
    }
)
{
    const isLoading = ref<boolean>(false);
    const currentPage = ref<number>(toValue(args.pageIndex));
    const lastCallResult = ref<UpdaterReturnType<T> | null>(null);
    const lastCallTime = ref<number>(0);
    const hasNextPage = computed(() =>
    {
        if (lastCallResult.value === null) return false;
        return currentPage.value < getMaxPageIndex(lastCallResult.value.totalItems, toValue(args.pageSize))
    });
    const hasLastPage = computed(() => lastCallResult.value === null ? false : (currentPage.value > 0));
    const lastCallMaxPageIndex = computed(() => getMaxPageIndex(lastCallResult.value === null ? 0 : lastCallResult.value.totalItems, toValue(args.pageSize)));
    const viewportStartIndex = computed(() => currentPage.value * toValue(args.pageSize));
    const viewportEndIndex = computed(() => (currentPage.value + 1) * toValue(args.pageSize));

    const getMaxPageIndex = (totalItems: number, pageSize: number) => Math.ceil(((totalItems ?? 1) / pageSize)) - 1;

    const call = async () =>
    {
        const callTime = Date.now();
        lastCallTime.value = callTime;
        isLoading.value = true;
        const callResult = await args.updater(viewportStartIndex.value, viewportEndIndex.value);
        if (callTime !== lastCallTime.value) return; // race-condition
        lastCallResult.value = callResult;
        if (currentPage.value > lastCallMaxPageIndex.value && args.overflowResolutionHandler)
            args.overflowResolutionHandler(toValue(currentPage), toValue(lastCallMaxPageIndex.value))
        isLoading.value = false;
    };

    watch(toRef(args.pageIndex), (newVal, oldVal) =>
    {
        if (toValue(oldVal) === toValue(newVal)) return;
        currentPage.value = toValue(newVal);
    });
    watch(currentPage, (newVal,oldVal) =>
    {
        if (toValue(oldVal) === toValue(newVal)) return;
        // @ts-ignore
        if (isRef(args.pageIndex) && !isReadonly(args.pageIndex)) args.pageIndex.value = newVal;
        call();
    });

    if (toValue(args.updateOnMount))
        onMounted(() => call());

    return {
        isLoading: readonly(isLoading),
        currentPage,
        lastCallResult: readonly(lastCallResult),
        hasNextPage,
        hasLastPage,
        lastCallMaxPageIndex: readonly(lastCallMaxPageIndex),
        viewportStartIndex: readonly(viewportStartIndex),
        viewportEndIndex: readonly(viewportEndIndex),
        update: call
    }
}