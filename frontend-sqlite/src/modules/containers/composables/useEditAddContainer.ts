import type { ContainerDTO, GetContainerAPI, PostContainerAPI } from "@/../../api-types/container";
import { API_CONTAINERS_PATH, API_POST_CONTAINERS_PATH } from "@/apiPaths";
import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { formatDate } from "@/modules/core/utils/date";
import { waitUntil } from "@/modules/core/utils/wait";
import { useResettableObject } from "@/resettableObject";
import { computed, ref, toRaw } from "vue";

type OmitFromContainerDTO<K extends keyof ContainerDTO> = Omit<ContainerDTO, K>;
export type ContainerWorkingEntity = OmitFromContainerDTO<'creationDate'|'owner'> & { creationDate: string; };
export const DateFormatToShow = "YYYY-MM-DD hh:mm:ss.ms";

/**
 * A hook for internal use.
 * This controls how the container is loaded, but not how it's saved / edited.
 * This also controls the validation logics for the container.
 * Saving / Editing is not handled because it's different for "Editing" and "Creating" containers.
 */
function useContainerWorkingCopy()
{
    const containerLoadingState = ref<'LOADING' | "LOADED" | "NOT_FOUND" | "NOT_INITIALIZED" | "ERROR">("NOT_INITIALIZED");
    const containerLoadingError = ref(undefined);

    const readyToReset = computed(() =>
    {
        if (!containerToBeEdited.isChanged.value) return false;
        return true;
    });
    const readyToSave = computed(() =>
    {
        if (!containerToBeEdited.isChanged.value) return false;
        if (containerErrors.value) return false;
        return true;
    });

    const containerErrors = computed<string | undefined>(() => undefined);

    const containerToBeEdited = useResettableObject<undefined | ContainerWorkingEntity>(undefined, (latest, safePoint) =>
    {
        // Normalize JSON for comparison (null == '', date in epoch == date in string etc...)
        const normalizedIsEqual = (con1: ContainerWorkingEntity, con2: ContainerWorkingEntity) =>
        {
            if (Object.keys(con1).length !== Object.keys(con2).length) return false;
            for (const key of Object.keys(con1) as (keyof ContainerWorkingEntity)[])
            {
                const val1 = con1[key];
                const val2 = con2[key];
                if ((val1 === null && val2 === '') || val2 === null && val1 === '') continue;
                if (val2 === val1) continue;
                return false;
            }
            return true;
        };

        const [latestObj, safePointObj] = [toRaw(latest), toRaw(safePoint)];
        if (!latestObj || !safePointObj) return false;

        return normalizedIsEqual(latestObj, safePointObj);
    });

    const loadContainer = async (containerID: string) =>
    {
        const targetContainer = useNetworkRequest<GetContainerAPI.ResponseDTO>
        (
            {
                url: API_CONTAINERS_PATH, method: "GET",
                query: { id: containerID }, body: { }
            },
            { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: false }
        );

        containerLoadingState.value = 'LOADING';
        targetContainer.updateData();
        await waitUntil(() => !targetContainer.isLoading.value, 100);

        if (targetContainer.error.value)
        {
            containerLoadingError.value = targetContainer.error.value;
            containerLoadingState.value = 'ERROR';
            return;
        }

        const firstContainer = targetContainer.lastSuccessfulData.value?.rangeItems[0];
        if (firstContainer)
        {
            containerToBeEdited.markSafePoint(
            {
                ...toRaw(firstContainer),
                creationDate: formatDate(new Date(firstContainer.creationDate), DateFormatToShow)
            });
            containerLoadingState.value = 'LOADED';
        }
        else containerLoadingState.value = 'NOT_FOUND';
    };

    return {
        loadContainer,
        containerLoadingError,
        containerLoadingState,
        containerErrors,
        readyToReset,
        readyToSave,
        containerToBeEdited
    };
}

export function useEditContainer()
{
    const containerWorkingCopyHook = useContainerWorkingCopy();

    const isContainerSaving = ref(false);
    const containerSavingError = ref(undefined);

    const submitSave = async () =>
    {
        alert("API Not ready yet");
        return;

        // if (!containerWorkingCopyHook.containerToBeEdited.currentData.value)
        //     throw new Error(`Cannot save when current data is not defined.`);
        // const transformedTxn = structuredClone(toRaw(containerWorkingCopyHook.containerToBeEdited.currentData.value));

        // const putTxnRequest = useNetworkRequest<PostContainerAPI.ResponseDTO>
        // (
        //     {
        //         query: { "targetTxnId": `${containerWorkingCopyHook.containerToBeEdited.currentData.value.id}` },
        //         url: `${API_POST_CONTAINERS_PATH}`,
        //         method: "PUT",
        //         body:
        //         {
        //             name: transformedTxn.name,
        //         } satisfies PostContainerAPI.RequestDTO
        //     },
        //     {
        //         updateOnMount: false,
        //         autoResetOnUnauthorized: true,
        //         includeAuthHeaders: true
        //     },
        // );

        // isContainerSaving.value = true;
        // await putTxnRequest.updateData();
        // containerSavingError.value = putTxnRequest.error.value;
        // isContainerSaving.value = false;
        // containerWorkingCopyHook.containerToBeEdited.markSafePoint(containerWorkingCopyHook.containerToBeEdited.currentData.value);
    };

    return {
        submitSave,
        containerSavingError,
        isContainerSaving,
        ...containerWorkingCopyHook
    };
}

export function useAddContainer()
{
    const containerWorkingCopyHook = useContainerWorkingCopy();

    const isContainerSaving = ref(false);
    const containerSavingError = ref(undefined);

    // Create an empty container for editing
    const init = () =>
    {
        const emptyRawContainer: ContainerWorkingEntity =
        {
            name: "",
            creationDate: '',
            id: "<default>",
        };

        containerWorkingCopyHook.containerToBeEdited.markSafePoint(emptyRawContainer);

        // Now we put the default value as the working value without marking safe point,
        // so the user can save this working entity as-is.

        const defaultRawContainer: ContainerWorkingEntity =
        {
            name: "My new container",
            creationDate: '',
            id: "<default>",
        };

        containerWorkingCopyHook.containerToBeEdited.currentData.value = defaultRawContainer;
    };

    const save = async (): Promise<{savedContainerId: string|undefined}> =>
    {
        if (!containerWorkingCopyHook.containerToBeEdited.currentData.value)
            throw new Error(`Cannot save when current data is not defined.`);

        const transformedContainer = structuredClone(toRaw(containerWorkingCopyHook.containerToBeEdited.currentData.value));
        const postContainerRequest = useNetworkRequest<PostContainerAPI.ResponseDTO>
        (
            {
                query: {},
                url: `${API_POST_CONTAINERS_PATH}`,
                method: "POST",
                body:
                {
                    name: transformedContainer.name,
                } satisfies PostContainerAPI.RequestDTO
            },
            {
                updateOnMount: false,
                autoResetOnUnauthorized: true,
                includeAuthHeaders: true
            },
        );

        isContainerSaving.value = true;
        await postContainerRequest.updateData();
        containerSavingError.value = (() =>
        {
            if (!postContainerRequest.error.value) return undefined;
            return postContainerRequest.error.value['msg'] || postContainerRequest.error.value
        })();
        isContainerSaving.value = false;
        if (!containerSavingError.value)
            containerWorkingCopyHook.containerToBeEdited.markSafePoint(containerWorkingCopyHook.containerToBeEdited.currentData.value);
        return {
            savedContainerId: postContainerRequest.error.value ? undefined : postContainerRequest.lastSuccessfulData.value?.id
        };
    };

    return {
        init,
        save,
        containerSavingError,
        isContainerSaving,
        ...containerWorkingCopyHook
    };
};