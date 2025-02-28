import type { GetTxnAPI } from "@/../../api-types/txn";

export function getTxnClassification(txn: GetTxnAPI.TxnDTO)
{
    const delta = parseFloat(txn.changeInValue);
    if (delta === 0) return "Transfer";
    else if (delta < 0) return "Expense";
    else return "Income";
};

export function formatChangeInValue(value:number)
{
    if (value == undefined) return '';
    if (value == 0) return '~'
    if (value > 0) return `+${value.toFixed(1)}`;
    else return value.toFixed(1);
}