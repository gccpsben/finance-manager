import { Decimal } from "decimal.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { TransactionService } from "./transaction.service.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { Transaction } from "../entities/transaction.entity.js";
import { DecimalAdditionMapReducer, nameof } from "../servicesUtils.js";

export type UserBalanceHistoryMap = { [epoch: string]: { [currencyId: string]: Decimal } };
export type UserBalanceHistoryResults = 
{
    historyMap: UserBalanceHistoryMap,
    currenciesEarliestPresentEpoch: { [currencyId: string]: number }
};

export class CalculationsService
{
    public static async getUserExpensesAndIncomes(userId: string)
    {
        if (!userId) throw new Error(`getUserExpensesAndIncomes: userId cannot be null or undefined.`);
    
        const allTxns = await TransactionRepository.getInstance().createQueryBuilder(`txn`)
        .select(
        [
            `txn.${nameof<Transaction>('ownerId')}`,
            `txn.${nameof<Transaction>('creationDate')}`,
            `txn.${nameof<Transaction>('toAmount')}`, 
            `txn.${nameof<Transaction>('toContainerId')}`, 
            `txn.${nameof<Transaction>('toCurrencyId')}`,
            `txn.${nameof<Transaction>('fromAmount')}`, 
            `txn.${nameof<Transaction>('fromContainerId')}`, 
            `txn.${nameof<Transaction>('fromCurrencyId')}`,
            `txn.${nameof<Transaction>('creationDate')}`
        ])
        .where(`txn.${nameof<Transaction>('ownerId')} = :ownerId`, { ownerId: userId })
        .getMany() as SQLitePrimitiveOnly<Transaction>[];
        
        const now = new Date().getTime();
        const total = { expenses: new Decimal('0'), incomes: new Decimal("0") };
        const total30d = { expenses: new Decimal('0'), incomes: new Decimal("0") };
        const total7d = { expenses: new Decimal('0'), incomes: new Decimal("0") };
    
        let currencyBaseValueMapping = { };
        for (let txn of allTxns)
        {
            const { increaseInValue, currencyBaseValMapping: newCurrencyBaseValueMapping } =
                await TransactionService.getTxnIncreaseInValue(userId, txn, currencyBaseValueMapping);
    
            currencyBaseValueMapping = newCurrencyBaseValueMapping;
            const isValueDecreased = increaseInValue.lessThanOrEqualTo(new Decimal('0'));
            const txnAgeMs = now - txn.creationDate;
            const txnIs30d = txnAgeMs <= 2.592e+9;
            const txnIs7d = txnAgeMs <= 6.048e+8;
    
            if (isValueDecreased)
            {
                const delta = increaseInValue.neg();
                total.expenses = total.expenses.add(delta);
                if (txnIs30d) total30d.expenses = total30d.expenses.add(delta);
                if (txnIs7d) total7d.expenses = total7d.expenses.add(delta);
            }
            else 
            {
                total.incomes = total.incomes.add(increaseInValue);
                if (txnIs30d) total30d.incomes = total30d.incomes.add(increaseInValue);
                if (txnIs7d) total7d.incomes = total7d.incomes.add(increaseInValue);
            }
        }
        return {
            total: total,
            total30d: total30d,
            total7d: total7d
        };
    }

    /** Get the balance history of a user across all containers. */
    public static async getUserBalanceHistory(userId: string): Promise<UserBalanceHistoryResults>
    {
        const usrTxns = (await TransactionService.getTransactions(userId)).rangeItems.reverse();
        const output: UserBalanceHistoryResults = 
        {
            currenciesEarliestPresentEpoch: {},
            historyMap: {}
        };
        const balancesReducer = new DecimalAdditionMapReducer<string>({});
        const appendCurrencyToEpoch = (cId: string, epoch: number) => 
        {
            if (output.currenciesEarliestPresentEpoch[cId]) return;
            output.currenciesEarliestPresentEpoch[cId] = epoch;
        };

        for (const txn of usrTxns)
        {
            if (txn.fromAmount)
            {
                await balancesReducer.reduce(txn.fromCurrencyId, new Decimal(txn.fromAmount).neg());
                appendCurrencyToEpoch(txn.fromCurrencyId, txn.creationDate);
            }
            if (txn.toAmount) 
            {
                await balancesReducer.reduce(txn.toCurrencyId, new Decimal(txn.toAmount));
                appendCurrencyToEpoch(txn.toCurrencyId, txn.creationDate);
            }
            output.historyMap[txn.creationDate.toString()] = { ...balancesReducer.currentValue };
        }
        return output;
    }
}