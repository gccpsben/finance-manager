export class RepositoryCache
{
    protected _ownerId: string;
    public getOwnerId() { return this._ownerId; }
    public constructor(ownerId: string) { this._ownerId = ownerId }
    protected throwOwnerIdMismatchError()
    {
        throw new Error(`DataCache owner mismatch: Data inserted into DataCache must only belong to one user.`);
    }
}