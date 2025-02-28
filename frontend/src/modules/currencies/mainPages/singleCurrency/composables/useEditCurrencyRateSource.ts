import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { computed, readonly, ref, toRaw, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";
import type { GetCurrencyRateSrcBySrcIdAPI, PatchCurrencyRateSrcAPI, PostCurrencyRateSrcAPI } from "../../../../../../../api-types/currencyRateSource";
import { useResettableObject } from "@/resettableObject";
import { waitUntil } from "@/modules/core/utils/wait";
import { API_PATCH_CURRENCIES_RATE_SRCS_PATH, API_POST_CURRENCIES_RATE_SRCS_PATH } from "@/apiPaths";

type CurrencyRateSrcWorkingEntity =
{
    refAmountCurrencyId: string,
    hostname: string,
    path: string,
    jsonQueryString: string,
    name: string,
    id: string
};

/**
 * A composable to manage POST / PATCH request of currency rate source.
 * If the 'id' field of current working copy is null or undefined, this will be treated as a POST request.
 */
export function usePostPatchCurrencyRateSrc(refCurrencyId: string)
{
    type StateEnum = 'LOADING' | "LOADED" | "NOT_FOUND" | "NOT_INITIALIZED" | "ERROR";

    const srcLoadingState = ref<StateEnum>("NOT_INITIALIZED");
    const srcLoadingError = ref(undefined);

    const isSrcSubmitting = ref(false);
    const srcSubmissionError = ref(undefined);

    const rateSrcWorkingCopy = useResettableObject<CurrencyRateSrcWorkingEntity | null>(
        null,
        (latest, safePt) => JSON.stringify(toRaw(latest)) === JSON.stringify(toRaw(safePt))
    )

    const loadSrc = async (srcId: string) =>
    {
        const getNetworkReq = useNetworkRequest<GetCurrencyRateSrcBySrcIdAPI.ResponseDTO>
        (
            `/api/v1/currencyRateSources/${srcId}` satisfies GetCurrencyRateSrcBySrcIdAPI.Path<string>,
            { includeAuthHeaders: true, updateOnMount: false }
        );
        srcLoadingState.value = 'LOADING';

        rateSrcWorkingCopy.markSafePoint(null);
        getNetworkReq.updateData();

        await waitUntil(() => !getNetworkReq.isLoading.value, 100);

        if (getNetworkReq.error.value)
        {
            srcLoadingError.value = getNetworkReq.error.value;
            srcLoadingState.value = 'ERROR';
            return;
        }
        else
        {
            rateSrcWorkingCopy.markSafePoint(getNetworkReq.lastSuccessfulData.value);
            srcLoadingState.value = 'LOADED';
        }
    };

    const submit = async () =>
    {
        srcSubmissionError.value = undefined;

        if (!rateSrcWorkingCopy || !rateSrcWorkingCopy.currentData.value)
            throw new Error(`Cannot submit when hook not initialized.`);

        const mode = !!rateSrcWorkingCopy.currentData.value.id ? "PATCH" : "POST";

        if (mode === 'PATCH')
        {
            const putSrcRequest = useNetworkRequest<PatchCurrencyRateSrcAPI.ResponseDTO>
            (
                {
                    url: `${API_PATCH_CURRENCIES_RATE_SRCS_PATH}`,
                    query: {},
                    method: "PATCH",
                    body:
                    {
                        hostname: rateSrcWorkingCopy.currentData.value.hostname,
                        name: rateSrcWorkingCopy.currentData.value.name,
                        jsonQueryString: rateSrcWorkingCopy.currentData.value.jsonQueryString,
                        refAmountCurrencyId: rateSrcWorkingCopy.currentData.value.refAmountCurrencyId,
                        id: rateSrcWorkingCopy.currentData.value.id,
                        path: rateSrcWorkingCopy.currentData.value.path,
                    } satisfies PatchCurrencyRateSrcAPI.RequestDTO
                }, { updateOnMount: false, autoResetOnUnauthorized: true, includeAuthHeaders: true },
            );

            isSrcSubmitting.value = true;
            await putSrcRequest.updateData();
            srcSubmissionError.value = putSrcRequest.error.value;
            isSrcSubmitting.value = false;
            rateSrcWorkingCopy.markSafePoint(rateSrcWorkingCopy.currentData.value);
        }
        else if (mode === 'POST')
        {
            const postSrcRequest = useNetworkRequest<PostCurrencyRateSrcAPI.ResponseDTO>
            (
                {
                    url: `${API_POST_CURRENCIES_RATE_SRCS_PATH}`,
                    query: {},
                    method: "POST",
                    body:
                    {
                        hostname: rateSrcWorkingCopy.currentData.value.hostname,
                        name: rateSrcWorkingCopy.currentData.value.name,
                        jsonQueryString: rateSrcWorkingCopy.currentData.value.jsonQueryString,
                        refAmountCurrencyId: rateSrcWorkingCopy.currentData.value.refAmountCurrencyId,
                        path: rateSrcWorkingCopy.currentData.value.path,
                        refCurrencyId: refCurrencyId
                    } satisfies PostCurrencyRateSrcAPI.RequestDTO
                }, { updateOnMount: false, autoResetOnUnauthorized: true, includeAuthHeaders: true },
            );

            isSrcSubmitting.value = true;
            await postSrcRequest.updateData();
            srcSubmissionError.value = postSrcRequest.error.value;
            isSrcSubmitting.value = false;
            rateSrcWorkingCopy.markSafePoint(rateSrcWorkingCopy.currentData.value);
        }
    };

    return {
        loadSrc,
        currentData: computed(() => rateSrcWorkingCopy.currentData.value),
        isChanged: computed(() => rateSrcWorkingCopy.isChanged.value ?? false),
        srcLoadingError: readonly(srcLoadingError),
        srcLoadingState: readonly(srcLoadingState),
        reset: rateSrcWorkingCopy.reset,
        markSafePoint: (value: CurrencyRateSrcWorkingEntity) => rateSrcWorkingCopy.markSafePoint(value),
        submit,
    }
}