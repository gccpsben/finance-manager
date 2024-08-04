import type { NetWorthAPIResponse } from "@/stores/store";
import type { NamedObject, IDObject } from "../interfaces";
import type { DashboardSummary } from "./dashboardSummaryDTO";
import type { ValueHydratedContainer } from "./containersDTO";
import type { RateDefinedCurrency } from "./currenciesDTO";

export type DashboardBatchDTO = 
{
    summary: DashboardSummary,
    netWorth: NetWorthAPIResponse,
    containersHydrated: ValueHydratedContainer[],
    currenciesHydrated: RateDefinedCurrency[]
}; 