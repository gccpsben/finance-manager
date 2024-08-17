
import { type SQLitePrimitiveOnly } from "../../index.d.js";
import { RepositoryCache } from "../dataCache.js";
import { Transaction } from "../entities/transaction.entity.js";
import { TransactionService } from "../services/transaction.service.js";

export class UserAllTxnsCache extends RepositoryCache
{   
    private _txns: SQLitePrimitiveOnly<Transaction>[] = [];

    public constructor(ownerId: string) { super(ownerId); }
    public getTxns() { return this._txns; }
    public setTxns(txns: SQLitePrimitiveOnly<Transaction>[])
    {
        if (txns.some(t => t.ownerId !== this._ownerId))
            return this.throwOwnerIdMismatchError();
        this._txns = txns;
    }
    public async ensureTxns()
    {
        this.setTxns((await TransactionService.getTransactions(this._ownerId)).rangeItems);
    }
}