import type { GetTxnAPI, PutTxnAPI } from "@/../../api-types/txn";
import { API_PUT_TRANSACTIONS_PATH, API_TRANSACTIONS_PATH } from "@/apiPaths";
import { useContainersStore } from "@/modules/containers/stores/useContainersStore";
import { useNetworkRequest } from "@/modules/core/composables/useNetworkRequest";
import { formatDate } from "@/modules/core/utils/date";
import { isNumeric } from "@/modules/core/utils/numbers";
import { waitUntil } from "@/modules/core/utils/wait";
import { useCurrenciesStore } from "@/modules/currencies/stores/useCurrenciesStore";
import { useResettableObject } from "@/resettableObject";
import { computed, ref, toRaw } from "vue";

type OmitFromTxnDTO<K extends keyof GetTxnAPI.TxnDTO> = Omit<GetTxnAPI.TxnDTO, K>;
export type TxnWorkingEntity = OmitFromTxnDTO<'creationDate'> & { creationDate: string; };
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
    const isEnteredDateValid = computed(() => !isNaN(new Date(`${txnToBeEdited.currentData.value?.creationDate}`).getTime()));
    const isEnteredFromAmountValid = computed(() => isNumeric(txnToBeEdited.currentData?.value?.fromAmount));
    const isEnteredToAmountValid = computed(() => isNumeric(txnToBeEdited.currentData?.value?.toAmount));

    const txnErrors = computed<string | undefined>(() =>
    {
        const txn = txnToBeEdited.currentData.value;
        if (!txn) return 'Loading...';

        const toContainer = txn.toContainer;
        const toCurrency = txn.toCurrency;
        const fromContainer = txn.fromContainer;
        const fromCurrency = txn.fromCurrency;

        if (!txn.fromAmount && !txn.toAmount) return "At least one of 'From' or 'To' sections must be provided.";
        if (!isEnteredDateValid.value) return 'The date provided is invalid.';
        if (!txn.title.trim()) return 'A name must be provided.';
        if (!!toContainer && !toCurrency) return "A currency must be selected in the 'To' section.";
        if (!!fromContainer && !fromCurrency) return "A currency must be selected in the 'From' section.";
        if (!fromContainer && !toContainer) return "Either container in 'From' or container in 'To' is missing.";
        if (!!fromContainer && !isEnteredFromAmountValid.value) return "The value provided in section 'From' must be a number.";
        if (!!toContainer && !isEnteredToAmountValid.value) return "The value provided in section 'to' must be a number.";
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
        // Normalize JSON for comparison (null == '', date in epoch == date in string etc...)
        const normalizedIsEqual = (txn1: TxnWorkingEntity, txn2: TxnWorkingEntity) =>
        {
            if (Object.keys(txn1).length !== Object.keys(txn2).length) return false;
            for (const key of Object.keys(txn1) as (keyof TxnWorkingEntity)[])
            {
                const val1 = txn1[key];
                const val2 = txn2[key];
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
        await waitUntil(() => !currencies.isLoading, 100);
        await waitUntil(() => !containers.isLoading, 100);
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
        isEnteredDateValid,
        isEnteredFromAmountValid,
        isEnteredToAmountValid,
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
            if (transformedTxn.toContainer === null)
            {
                transformedTxn.toCurrency = null;
                transformedTxn.toAmount = null;
            }
            if (transformedTxn.fromContainer === null)
            {
                transformedTxn.fromCurrency = null;
                transformedTxn.fromAmount = null;
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
                    txnTypeId: transformedTxn.txnType,
                    creationDate: new Date(transformedTxn.creationDate).getTime(),
                    description: transformedTxn.description ?? undefined,
                    fromAmount: transformedTxn.fromAmount ?? undefined,
                    fromContainerId: transformedTxn.fromContainer ?? undefined,
                    fromCurrencyId: transformedTxn.fromCurrency ?? undefined,
                    toAmount: transformedTxn.toAmount ?? undefined,
                    toContainerId: transformedTxn.toContainer ?? undefined,
                    toCurrencyId: transformedTxn.toCurrency ?? undefined
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