import type { TransactionTypesDTO } from "@/../../api-types/txnType";

export function getTxnTypeNameById(id: string, types: TransactionTypesDTO[])
{
    return types.find(type => type.id == id)?.name;
}