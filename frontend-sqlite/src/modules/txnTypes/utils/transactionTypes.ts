import type { TxnTypesDTO } from "@/../../api-types/txnType";

export function getTxnTypeNameById(id: string, types: TxnTypesDTO[])
{
    return types.find(type => type.id == id)?.name;
}