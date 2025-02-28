import type { HydratedTransaction } from "./transactionsDTO";

export type DashboardSummary =
{
    totalIncomes30d: number;
    totalExpenses30d: number;
    totalIncomes7d: number;
    totalExpenses7d: number;
    totalIncomes: number;
    totalExpenses: number;
    incomes30d: HydratedTransaction[];
    expenses30d: HydratedTransaction[];
    allPendingTransactions: HydratedTransaction[];
    totalTransactionsCount: number;
    totalValue: number;
};