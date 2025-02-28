import type { GetTxnAPI, PostTxnAPI, PutTxnAPI } from "@/../../api-types/txn";
import { API_PUT_TRANSACTIONS_PATH, API_TRANSACTIONS_PATH } from "@/apiPaths";
import { useContainersStore } from "@/modules/containers/stores/useContainersStore";
import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { formatDate } from "@/modules/core/utils/date";
import { isNumeric } from "@/modules/core/utils/numbers";
import { waitUntil } from "@/modules/core/utils/wait";
import { useCurrenciesStore } from "@/modules/currencies/stores/useCurrenciesStore";
import { useTxnTagsStore } from "@/modules/txnTypes/stores/useTxnTypesStore";
import { useResettableObject } from "@/resettableObject";
import { transform } from "typescript";
import { computed, ref, toRaw } from "vue";

type OmitFromTxnDTO<K extends keyof GetTxnAPI.TxnDTO> = Omit<GetTxnAPI.TxnDTO, K>;
export type TxnWorkingEntity = OmitFromTxnDTO<'creationDate'|'owner'|'changeInValue'> & { creationDate: string; };
export const DateFormatToShow = "YYYY-MM-DD hh:mm:ss.ms";

/**
 * A hook for internal use.
 * This controls how the txn is loaded, but not how it's saved / edited.
 * This also controls the validation logics for the txn.
 * Saving / Editing is not handled because it's different for "Editing" and "Creating" transactions.
 */
function useTxnWorkingCopy()
{
    const txnLoadingState = ref<'LOADING' | "LOADED" | "NOT_FOUND" | "NOT_INITIALIZED" | "ERROR">("NOT_INITIALIZED");
    const txnLoadingError = ref(undefined);
    const { currencies } = useCurrenciesStore();
    const { containers } = useContainersStore();
    const { txnTags: txnTypes } = useTxnTagsStore();
    const isEnteredDateValid = computed(() => !isNaN(new Date(`${txnToBeEdited.currentData.value?.creationDate}`).getTime()));

    const txnErrors = computed<string | undefined>(() =>
    {
        const txn = txnToBeEdited.currentData.value;
        if (!txn) return 'Loading...';

        for (let i = 0; i < txn.fragments.length; i++)
        {
            const fragment = txn.fragments[i];
            const toContainer = fragment.toContainer;
            const toCurrency = fragment.toCurrency;
            const fromContainer = fragment.fromContainer;
            const fromCurrency = fragment.fromCurrency;

            const isFromAmountValid = isNumeric(fragment.fromAmount);
            const isToAmountValid = isNumeric(fragment.toAmount);

            if (!fragment.fromAmount && !fragment.toAmount) return `At least one of 'From' or 'To' sections must be provided (fragment #${i+1}).`;
            if (!!toContainer && !toCurrency) return `A currency must be selected in the 'To' section (fragment #${i+1}).`;
            if (!!fromContainer && !fromCurrency) return `A currency must be selected in the 'From' section (fragment #${i+1}).`;
            if (!fromContainer && !toContainer) return `Either container in 'From' or container in 'To' is missing (fragment #${i+1}).`;
            if (!!fromContainer && !isFromAmountValid) return `The value provided in section 'From' must be a number (fragment #${i+1}).`;
            if (!!toContainer && !isToAmountValid) return `The value provided in section 'to' must be a number (fragment #${i+1}).`;
        }

        if (!isEnteredDateValid.value) return 'The date provided is invalid.';
        if (!txn.title.trim()) return 'A name must be provided.';

        return undefined;
    });

    const readyToReset = computed(() =>
    {
        if (!txnToBeEdited.isChanged.value) return false;
        return true;
    });
    const readyToSave = computed(() =>
    {
        if (!txnToBeEdited.isChanged.value) return false;
        if (txnErrors.value) return false;
        return true;
    });

    const txnToBeEdited = useResettableObject<undefined | TxnWorkingEntity>(undefined, (latest, safePoint) =>
    {
        const [latestObj, safePointObj] = [toRaw(latest), toRaw(safePoint)];
        if (!latestObj || !safePointObj) return false;

        return JSON.stringify(latestObj) === JSON.stringify(safePointObj);
    });

    const loadTxn = async (txnID: string) =>
    {
        const targetTxn = useNetworkRequest<GetTxnAPI.ResponseDTO>
        (
            {
                url: API_TRANSACTIONS_PATH, method: "GET",
                query: { id: txnID }, body: { }
            },
            { autoResetOnUnauthorized: true, includeAuthHeaders: true, updateOnMount: false }
        );

        txnLoadingState.value = 'LOADING';
        targetTxn.updateData();
        currencies.updateData();
        containers.updateData();
        txnTypes.updateData();
        await waitUntil(() => !currencies.isLoading, 100);
        await waitUntil(() => !containers.isLoading, 100);
        await waitUntil(() => !txnTypes.isLoading, 100);
        await waitUntil(() => !targetTxn.isLoading.value, 100);

        if (targetTxn.error.value)
        {
            txnLoadingError.value = targetTxn.error.value;
            txnLoadingState.value = 'ERROR';
            return;
        }

        const firstTxn = targetTxn.lastSuccessfulData.value?.rangeItems[0];
        if (firstTxn)
        {
            txnToBeEdited.markSafePoint(
            {
                ...toRaw(firstTxn),
                creationDate: formatDate(new Date(firstTxn.creationDate), DateFormatToShow)
            });
            txnLoadingState.value = 'LOADED';
        }
        else txnLoadingState.value = 'NOT_FOUND';
    };

    return {
        loadTxn,
        txnLoadingError,
        txnLoadingState,
        currencies,
        containers,
        txnTags: txnTypes,
        isEnteredDateValid,
        txnErrors,
        readyToReset,
        readyToSave,
        txnToBeEdited
    };
}

export function useEditTxn()
{
    const txnWorkingCopyHook = useTxnWorkingCopy();

    const isTxnSaving = ref(false);
    const txnSavingError = ref(undefined);

    const submitSave = async () =>
    {
        if (!txnWorkingCopyHook.txnToBeEdited.currentData.value)
            throw new Error(`Cannot save when current data is not defined.`);
        const transformedTxn = structuredClone(toRaw(txnWorkingCopyHook.txnToBeEdited.currentData.value));

        // Transform txn body to fit validation:
        (() =>
        {
            for (const frag of transformedTxn.fragments)
            {
                if (frag.toContainer === null)
                {
                    frag.toCurrency = null;
                    frag.toAmount = null;
                }
                if (frag.fromContainer === null)
                {
                    frag.fromCurrency = null;
                    frag.fromAmount = null;
                }
            }
        })();

        const putTxnRequest = useNetworkRequest<PutTxnAPI.ResponseDTO>
        (
            {
                query: { "targetTxnId": `${txnWorkingCopyHook.txnToBeEdited.currentData.value.id}` },
                url: `${API_PUT_TRANSACTIONS_PATH}`,
                method: "PUT",
                body:
                {
                    title: transformedTxn.title,
                    tagIds: transformedTxn.tagIds,
                    creationDate: new Date(transformedTxn.creationDate).getTime(),
                    description: transformedTxn.description ?? undefined,
                    fragments: transformedTxn.fragments.map(f => ({
                        fromAmount: f.fromAmount ?? null,
                        fromContainer: f.fromContainer ?? null,
                        fromCurrency: f.fromCurrency ?? null,
                        toAmount: f.toAmount ?? null,
                        toContainer: f.toContainer ?? null,
                        toCurrency: f.toCurrency ?? null
                    })),
                    excludedFromIncomesExpenses: transformedTxn.excludedFromIncomesExpenses,
                    fileIds: transformedTxn.fileIds
                } satisfies PutTxnAPI.RequestBodyDTO
            },
            {
                updateOnMount: false,
                autoResetOnUnauthorized: true,
                includeAuthHeaders: true
            },
        );

        isTxnSaving.value = true;
        await putTxnRequest.updateData();
        txnSavingError.value = putTxnRequest.error.value;
        isTxnSaving.value = false;
        txnWorkingCopyHook.txnToBeEdited.markSafePoint(txnWorkingCopyHook.txnToBeEdited.currentData.value);
    };

    return {
        submitSave,
        txnSavingError,
        isTxnSaving,
        ...txnWorkingCopyHook
    };
};

export function useAddTxn()
{
    const txnWorkingCopyHook = useTxnWorkingCopy();

    const isTxnSaving = ref(false);
    const txnSavingError = ref(undefined);

    // Create an empty transaction for editing
    const init = () =>
    {
        const emptyRawTxn: TxnWorkingEntity =
        {
            title: "A new transaction",
            creationDate: '',
            description: '',
            id: "<default>",
            fragments: [{
                fromAmount: null,
                fromContainer: null,
                fromCurrency: null,
                toAmount: null,
                toCurrency: null,
                toContainer: null,
            }],
            tagIds: [],
            excludedFromIncomesExpenses: false,
            fileIds: []
        };

        txnWorkingCopyHook.txnToBeEdited.markSafePoint(emptyRawTxn);
    };

    const save = async () =>
    {
        if (!txnWorkingCopyHook.txnToBeEdited.currentData.value)
            throw new Error(`Cannot save when current data is not defined.`);

        const transformedTxn = structuredClone(toRaw(txnWorkingCopyHook.txnToBeEdited.currentData.value));

        // Transform txn body to fit validation:
        (() =>
        {
            for (const frag of transformedTxn.fragments)
            {
                if (frag.toContainer === null)
                {
                    frag.toCurrency = null;
                    frag.toAmount = null;
                }
                if (frag.fromContainer === null)
                {
                    frag.fromCurrency = null;
                    frag.fromAmount = null;
                }
            }
        })();

        const postTxnRequest = useNetworkRequest<PostTxnAPI.ResponseDTO>
        (
            {
                query: { "targetTxnId": `${txnWorkingCopyHook.txnToBeEdited.currentData.value.id}` },
                url: `${API_PUT_TRANSACTIONS_PATH}`,
                method: "POST",
                body:
                {
                    transactions:
                    [
                        {
                            title: transformedTxn.title,
                            tagIds: transformedTxn.tagIds,
                            creationDate: new Date(transformedTxn.creationDate).getTime(),
                            description: transformedTxn.description ?? null,
                            fragments: [
                                {
                                    fromAmount: transformedTxn.fragments[0].fromAmount ?? null,
                                    fromContainer: transformedTxn.fragments[0].fromContainer ?? null,
                                    fromCurrency: transformedTxn.fragments[0].fromCurrency ?? null,
                                    toAmount: transformedTxn.fragments[0].toAmount ?? null,
                                    toContainer: transformedTxn.fragments[0].toContainer ?? null,
                                    toCurrency: transformedTxn.fragments[0].toCurrency ?? null
                                }
                            ],
                            excludedFromIncomesExpenses: transformedTxn.excludedFromIncomesExpenses,
                            fileIds: transformedTxn.fileIds
                        }
                    ]
                } satisfies PostTxnAPI.RequestDTO
            },
            {
                updateOnMount: false,
                autoResetOnUnauthorized: true,
                includeAuthHeaders: true
            },
        );

        isTxnSaving.value = true;
        await postTxnRequest.updateData();
        txnSavingError.value = postTxnRequest.error.value;
        isTxnSaving.value = false;
        txnWorkingCopyHook.txnToBeEdited.markSafePoint(txnWorkingCopyHook.txnToBeEdited.currentData.value);
    };

    return {
        init,
        save,
        txnSavingError,
        isTxnSaving,
        ...txnWorkingCopyHook
    };
};