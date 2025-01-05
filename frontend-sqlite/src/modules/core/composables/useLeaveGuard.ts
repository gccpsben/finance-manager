import { ref, toRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { onBeforeRouteLeave } from "vue-router";

export function useLeaveGuard(
    shouldBlock: MaybeRefOrGetter<boolean>,
    guardMsg: MaybeRefOrGetter<string> = `You have unsaved changes. Do you really want to leave?`
)
{
    const msg = ref<string>(toValue(guardMsg));
    watch(toRef(guardMsg), newVal => msg.value = newVal);

    // Both callbacks are required, onBeforeRouteLeave for Vue-Router, watch for refreshes.
    onBeforeRouteLeave(e =>
    {
        if (!toValue(shouldBlock)) return true;
        const answer = window.confirm(msg.value);
        if (!answer) return false;
    });
    watch(toRef(shouldBlock), (newVal, oldVal) =>
    {
        if (newVal) window.onbeforeunload = event => { event.preventDefault(); };
        else window.onbeforeunload = null;
    }, { immediate: true });
}