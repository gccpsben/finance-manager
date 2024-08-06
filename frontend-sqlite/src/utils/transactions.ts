import type { TransactionDTO } from '../../../api-types/txn';

export function getTxnClassification(txn:TransactionDTO)
{ 
    if (txn.fromAmount && txn.toAmount) return "Transfer";
    else if (txn.fromAmount && !txn.toAmount) return "Expense";
    else return "Income"; 
};

export function formatChangeInValue(value:number)
{
    if (value == undefined) return '';
    if (value == 0) return '~'
    if (value > 0) return `+${value.toFixed(1)}`;
    else return value.toFixed(1);
}