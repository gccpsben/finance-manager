import { ref, toRaw, watch, type Ref } from "vue";

export function useResettableObject<T>(initialValue: T, equalityProvider?: (latest: T|undefined, safePoint: T|undefined) => boolean)
{
    const lastSafePoint: Ref<T|undefined> = ref(undefined) as Ref<T|undefined>;
    const currentData: Ref<T|undefined> = ref(undefined) as Ref<T|undefined>;
    const isChanged: Ref<boolean> = ref(false);

    /** A validator for a new safe point. Should return false if the new data failed validation.*/
    const safePointValidator = function (dataToCheck: T) { return true; } as (dataToCheck: T) => boolean;

    /** A callback when a new safepoint is successfully saved. */
    const safePointCallback = function () { } as () => void;

    if (!equalityProvider)
    {
        equalityProvider = function (latest: T|undefined, safePoint: T|undefined)
        {
            return JSON.stringify(latest) == JSON.stringify(safePoint);
        }
    }

    const markSafePoint = (data: T) =>
    {
        if (safePointValidator(data))
        {
            // lastSafePoint.value = JSON.parse(JSON.stringify(data));
            lastSafePoint.value = JSON.parse(JSON.stringify(data));
            currentData.value = JSON.parse(JSON.stringify(data));
            safePointCallback();
        }
    }

    if (initialValue)
        markSafePoint(initialValue);

    watch(currentData, () =>
    {
        const current = toRaw(currentData.value);
        const last = toRaw(lastSafePoint.value);
        isChanged.value = !equalityProvider(current, last);
    }, { immediate: true, deep: true });

    // const isChanged: ComputedRef<boolean> = computed(() => dataComparator(lastSafePoint.value, currentData.value));

    const reset = () =>
    {
        currentData.value = JSON.parse(JSON.stringify(lastSafePoint.value));
    }

    return {
        reset,
        lastSafePoint,
        currentData,
        safePointValidator,
        markSafePoint,
        isChanged
    }
}