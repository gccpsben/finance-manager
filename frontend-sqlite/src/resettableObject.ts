import { computed, ref, watch, type Ref } from "vue";

export class ResettableObject<T>
{
    lastSafePoint = ref<undefined|T>(undefined);
    currentData = ref<undefined|T>(undefined);
    isChanged = ref(false);
    changesWatcher = watch(this.currentData, (newVal, oldVal) =>
    {
        this.isChanged.value = !this.dataComparator(newVal, this.lastSafePoint.value);
    }, { deep: true });

    /**
     * A validator for a new safe point. Should return false if the new data failed validation.
     */
    safePointValidator = function (dataToCheck: T) { return true; } as (dataToCheck: T) => boolean;

    /**
     * A callback when a new safepoint is successfully saved.
     */
    safePointCallback = function () { } as () => void;

    dataComparator = function (latest: T|undefined, safePoint: T|undefined)
    { return JSON.stringify(latest) == JSON.stringify(safePoint); }

    markSafePoint(data: T)
    {
        if (this.safePointValidator(data))
        {
            this.lastSafePoint.value = structuredClone(data);
            this.safePointCallback();
        }
    }

    reset() { this.currentData.value = this.lastSafePoint.value; }

    constructor(initialData: T|undefined)
    {
        this.lastSafePoint.value = structuredClone(initialData);
        this.currentData.value = structuredClone(initialData);
    }
}