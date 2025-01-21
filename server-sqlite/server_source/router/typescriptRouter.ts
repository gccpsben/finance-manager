import express, { NextFunction, Router } from "express";

export type TypesafeRouteConfig<BodyType> =
{
    handler: (req: express.Request, res: express.Response) => Promise<BodyType> | never
}

export class TypesafeRouter
{
    private _router: Router;
    public getRouter() { return this._router; }

    public constructor(router: Router) { this._router = router; }
    public get<BodyType>(endpoint: string, config: TypesafeRouteConfig<BodyType>)
    {
        this._router.get(endpoint, async (req:express.Request, res:express.Response, next: NextFunction) =>
        {
            try { res.json(await config.handler(req, res)); }
            catch(e) { next(e); }
        });
    }
    public custom<BodyType>(endpoint: string, config: TypesafeRouteConfig<BodyType>)
    {
        this._router.get(endpoint, async (req:express.Request, res:express.Response, next: NextFunction) =>
        {
            try { await config.handler(req, res) }
            catch(e) { next(e); }
        });
    }
    public patch<BodyType>(endpoint: string, config: TypesafeRouteConfig<BodyType>)
    {
        this._router.patch(endpoint, async (req:express.Request, res:express.Response, next: NextFunction) =>
        {
            try { res.json(await config.handler(req, res)); }
            catch(e) { next(e); }
        });
    }
    public post<BodyType>(endpoint: string, config: TypesafeRouteConfig<BodyType>)
    {
        this._router.post(endpoint, async (req:express.Request, res:express.Response, next: NextFunction) =>
        {
            try { res.json(await config.handler(req, res)); }
            catch(e) { next(e); }
        });
    }
    public postBinary<BodyType>(endpoint: string, config: TypesafeRouteConfig<BodyType>)
    {
        this._router.post(endpoint, express.raw({type: "application/octet-stream"}), async (req:express.Request, res:express.Response, next: NextFunction) =>
        {
            try { res.json(await config.handler(req, res)); }
            catch(e) { next(e); }
        });
    }
    public put<BodyType>(endpoint: string, config: TypesafeRouteConfig<BodyType>)
    {
        this._router.put(endpoint, async (req:express.Request, res:express.Response, next: NextFunction) =>
        {
            try { res.json(await config.handler(req, res)); }
            catch(e) { next(e); }
        });
    }
    public delete<BodyType>(endpoint: string, config: TypesafeRouteConfig<BodyType>)
    {
        this._router.delete(endpoint, async (req:express.Request, res:express.Response, next: NextFunction) =>
        {
            try { res.json(await config.handler(req, res)); }
            catch(e) { next(e); }
        });
    }
}