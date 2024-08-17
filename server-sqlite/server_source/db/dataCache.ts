export class RepositoryCache
{
    protected _ownerId: string;
    public getOwnerId() { return this._ownerId; }
    public constructor(ownerId: string) { this._ownerId = ownerId }
}