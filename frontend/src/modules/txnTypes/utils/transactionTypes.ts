import type { TxnTagsDTO } from "@/../../api-types/txnTag";

export function getTxnTypeNameById(id: string, types: TxnTagsDTO[])
{
    return types.find(type => type.id == id)?.name;
}