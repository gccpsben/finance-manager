import { Decimal } from "decimal.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { TransactionService } from "./transaction.service.js";
import { SQLitePrimitiveOnly } from "../../index.d.js";
import { Transaction } from "../entities/transaction.entity.js";

export class CalculationsService
{
    public static async getUserExpensesAndIncomes(userId: string)
    {
        if (!userId) throw new Error(`getUserExpensesAndIncomes: userId cannot be null or undefined.`);
    
        const allTxns = await TransactionRepository.getInstance().createQueryBuilder(`txn`)
        .select(
        [
            "txn.ownerId",
            "txn.creationDate",
            "txn.toAmount", 
            "txn.toContainerId", 
            "txn.toCurrencyId",
            "txn.fromAmount", 
            "txn.fromContainerId", 
            "txn.fromCurrencyId",
        ])
        .where(`txn.ownerId = :ownerId`, { ownerId: userId })
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
            const txnAgeMs = now - txn.creationDate.getTime();
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
}