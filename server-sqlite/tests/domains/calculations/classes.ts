// deno-lint-ignore-file no-namespace
import { GetExpensesAndIncomesAPI, GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI } from "../../../../api-types/calculations.d.ts";
import { isDecimalJSString, IsDecimalJSString, IsEpochKeyedMap, IsPassing } from "../../../server_source/db/validators.ts";

export namespace GetUserBalanceHistoryAPIClass
{
    export class ResponseDTO implements GetUserBalanceHistoryAPI.ResponseDTO
    {
        @IsEpochKeyedMap()
        @IsPassing(value =>
        {
            if (typeof value !== 'object') return false;
            const val = value as { [epoch: string]: unknown };
            for (const innerMap of Object.values(val))
            {
                if (innerMap === null) return false;
                if (typeof innerMap !== 'object') return false;
                if (Object.keys(innerMap).some(k => typeof k !== 'string')) return false;
                if (Object.values(innerMap).some(v => !isDecimalJSString(v))) return false;
            }
            return true;
        })
        map!: { [epoch: string]: { [currencyId: string]: string; }; };
    }
}

export namespace GetUserNetworthHistoryAPIClass
{
    export class ResponseDTO implements GetUserNetworthHistoryAPI.ResponseDTO
    {
        @IsEpochKeyedMap()
        @IsPassing(value =>
        {
            if (typeof value !== 'object') return false;
            const val = value as { [epoch: string]: unknown };
            if (Object.keys(val).some(k => typeof k !== 'string')) return false;
            if (Object.values(val).some(v => !isDecimalJSString(v))) return false;
            return true;
        })
        map!: { [epoch: string]: string; };
    }
}

export namespace GetExpensesAndIncomesAPIClass
{
    export class ResponseDTO implements GetExpensesAndIncomesAPI.ResponseDTO
    {
        @IsDecimalJSString() expensesCurrentWeek!: string;
        @IsDecimalJSString() incomesCurrentWeek!: string;
        @IsDecimalJSString() expensesCurrentMonth!: string;
        @IsDecimalJSString() incomesCurrentMonth!: string;
        @IsDecimalJSString() expenses30d!: string;
        @IsDecimalJSString() incomes30d!: string;
        @IsDecimalJSString() expenses7d!: string;
        @IsDecimalJSString() incomes7d!: string;
    }
}