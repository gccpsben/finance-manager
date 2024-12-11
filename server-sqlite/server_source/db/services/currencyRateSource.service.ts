import path from "path";
import { MonadError, NestableError, NestableErrorSymbol, panic, unwrap } from "../../std_errors/monadError.js";
import { CurrencyRateSource } from "../entities/currencyRateSource.entity.js";
import { CurrencyRateSourceRepository } from "../repositories/currencyRateSource.repository.js";
import { ServiceUtils } from "../servicesUtils.js";
import { CurrencyNotFoundError, CurrencyService } from "./currency.service.js";
import { UserNotFoundError } from "./user.service.js";
import { FetchError } from "../../std_errors/netErrors.js";
import jmespath from 'jmespath';
import { CurrencyRateDatumService } from "./currencyRateDatum.service.js";
import { Decimal } from "decimal.js";
import { CurrencyRateDatum } from "../entities/currencyRateDatum.entity.js";
import type { IdBound } from "../../index.d.js";

export class InvalidNumberError extends MonadError<typeof InvalidNumberError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public valueGiven: string;
    public userId: string;

    constructor(valueGiven: any, userId: string)
    {
        super(InvalidNumberError.ERROR_SYMBOL, `The given argument is ${valueGiven} (typeof ${typeof valueGiven}), which is not a valid number.`);
        this.name = this.constructor.name;
        this.valueGiven = valueGiven;
        this.userId = userId;
    }
}

export class CurrencySrcNotFoundError extends MonadError<typeof InvalidNumberError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    public srcId: string;
    public userId: string;

    constructor(srcId: string, userId: string)
    {
        super(InvalidNumberError.ERROR_SYMBOL, `Cannot find a currency rate source with id='${srcId}' and ownerId='${userId}'`);
        this.name = this.constructor.name;
        this.srcId = srcId;
        this.userId = userId;
    }
}

export class PatchCurrencySrcValidationError extends MonadError<typeof InvalidNumberError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;

    public srcId: string;
    public msg: string;

    constructor(srcId: string, msg: string)
    {
        super(InvalidNumberError.ERROR_SYMBOL, `The new currency rate source failed validation: ${msg}`);
        this.name = this.constructor.name;
        this.srcId = srcId;
        this.msg = msg;
    }
}

export class ExecuteCurrencyRateSourceError<T extends Error> extends MonadError<typeof ExecuteCurrencyRateSourceError.ERROR_SYMBOL> implements NestableError
{
    [NestableErrorSymbol]: true;
    static readonly ERROR_SYMBOL: unique symbol;
    userId: string;
    currencyId: string;

    error: T;
    constructor(err: T, currencyId: string, userId: string)
    {
        super
        (
            ExecuteCurrencyRateSourceError.ERROR_SYMBOL,
            `Error occurred when fetching currency rate from source for ${currencyId}.`
        );
        this.currencyId = currencyId;
        this.userId = userId;
        this.name = this.constructor.name;
        this.error = err;
    }
}

export class CurrencyRateSourceService
{
    public static async createCurrencyRateSource
    (
        ownerId: string,
        hostname: string,
        name: string,
        jsonQueryString: string,
        path: string,
        refAmountCurrencyId: string,
        refCurrencyId: string,
    ): Promise<IdBound<CurrencyRateSource> | CurrencyNotFoundError>
    {
        const newCurrencyRateSource = CurrencyRateSourceRepository.getInstance().create();
        newCurrencyRateSource.hostname = hostname;
        newCurrencyRateSource.ownerId = ownerId;
        newCurrencyRateSource.name = name;
        newCurrencyRateSource.jsonQueryString = jsonQueryString;
        newCurrencyRateSource.path = path;
        newCurrencyRateSource.refAmountCurrencyId = refAmountCurrencyId;
        newCurrencyRateSource.refCurrencyId = refCurrencyId;

        const validationResult = await CurrencyRateSourceService.validateCurrencyRateSource(newCurrencyRateSource);

        if (validationResult === 'RefCurrencyNotFound' || validationResult === 'MissingRefCurrency')
            return new CurrencyNotFoundError(refCurrencyId, ownerId);

        if (validationResult === 'RefAmountCurrencyNotFound' || validationResult === 'MissingAmountCurrency')
            return new CurrencyNotFoundError(refAmountCurrencyId, ownerId);

        const newlySavedSrc = await CurrencyRateSourceRepository.getInstance().save(newCurrencyRateSource);
        if (!newlySavedSrc.id) throw panic(`Newly saved currency rate source contain falsy IDs.`);

        return newlySavedSrc as IdBound<typeof newlySavedSrc>;
    }

    public static async validateCurrencyRateSource(src: CurrencyRateSource): Promise<
        "RefCurrencyNotFound" | "RefAmountCurrencyNotFound" |
        "MissingRefCurrency" | "MissingAmountCurrency" | null
    >
    {
        if (!src.refAmountCurrencyId) return "MissingAmountCurrency";
        if (!src.refCurrencyId) return "MissingRefCurrency";

        const refCurrency = await CurrencyService.getCurrencyByIdWithoutCache(src.ownerId, src.refCurrencyId);
        const refAmountCurrency = await CurrencyService.getCurrencyByIdWithoutCache(src.ownerId, src.refAmountCurrencyId);

        if (refCurrency === null) return "RefCurrencyNotFound";
        if (refAmountCurrency === null) return "RefAmountCurrencyNotFound";

        return null;
    }

    public static async getUserCurrencyRatesSources
    (
        ownerId: string
    )
    {
        const userCurrencyRateSources = await CurrencyRateSourceRepository
        .getInstance()
        .find({ where: { ownerId: ownerId ?? null } });
        return userCurrencyRateSources;
    }

    public static async getUserCurrencyRatesSourcesOfCurrency
    (
        ownerId: string,
        currencyId: string
    ): Promise<IdBound<CurrencyRateSource>[]>
    {
        const userCurrencyRateSources = await CurrencyRateSourceRepository
        .getInstance()
        .find({ where: { ownerId: ownerId ?? null, refCurrencyId: currencyId ?? null } });

        if (userCurrencyRateSources.some(x => !x.id))
            throw panic(`CurrencyRateSources queried from database contain falsy IDs.`);

        return userCurrencyRateSources as IdBound<typeof userCurrencyRateSources[0]>[]
    }

    public static async getCurrencyRatesSourceById
    (
        ownerId: string,
        srcId: string
    ): Promise<IdBound<CurrencyRateSource> | null>
    {
        const userCurrencyRateSource = await CurrencyRateSourceRepository
        .getInstance()
        .findOne({ where: { ownerId: ownerId ?? null, id: srcId ?? null } });

        if (!userCurrencyRateSource?.id && !!userCurrencyRateSource)
            throw panic(`CurrencyRateSources queried from database contain falsy IDs.`);

        return userCurrencyRateSource as IdBound<typeof userCurrencyRateSource>;
    }

    public static async patchUserCurrencyRateSource
    (
        ownerId:string,
        patchArgs: IdBound<Partial<
        {
            hostname: string,
            jsonQueryString: string,
            name: string,
            path: string,
            refAmountCurrencyId: string
        }>>
    )
    {
        const originalSrc = await CurrencyRateSourceRepository
        .getInstance()
        .findOne({ where: { ownerId: ownerId ?? null, id: patchArgs.id ?? null } });

        if (!originalSrc) return new CurrencySrcNotFoundError(patchArgs.id, ownerId);

        if (patchArgs.hostname) originalSrc.hostname = patchArgs.hostname;
        if (patchArgs.jsonQueryString) originalSrc.jsonQueryString = patchArgs.jsonQueryString;
        if (patchArgs.name) originalSrc.name = patchArgs.name;
        if (patchArgs.path) originalSrc.path = patchArgs.path;
        if (patchArgs.refAmountCurrencyId) originalSrc.refAmountCurrencyId = patchArgs.refAmountCurrencyId;

        const validationResult = await CurrencyRateSourceService.validateCurrencyRateSource(originalSrc);
        if (validationResult !== null) return new PatchCurrencySrcValidationError(patchArgs.id, validationResult);

        const newlySavedSrc = await CurrencyRateSourceRepository.getInstance().save(originalSrc);
        return newlySavedSrc as IdBound<typeof newlySavedSrc>;
    }

    /**
     * Execute a currency rate source.
     * This will attempt to fetch the resources via the given source's URL.
     */
    public static async executeCurrencyRateSource
    (
        ownerId: string,
        currencySource: CurrencyRateSource,
        nowEpoch: number
    ): Promise<CurrencyRateDatum |
        ExecuteCurrencyRateSourceError<
            Error |
            CurrencyNotFoundError |
            UserNotFoundError |
            FetchError
        >
    >
    {
        const refCurrencyId = currencySource.refCurrencyId;

        try
        {
            const createError = <T extends Error>(err: T) =>
                new ExecuteCurrencyRateSourceError(err, currencySource.refCurrencyId, ownerId);

            ServiceUtils.ensureEntityOwnership(currencySource, ownerId);
            const currencyObj = await CurrencyService.getCurrencyByIdWithoutCache(ownerId, refCurrencyId);
            if (currencyObj instanceof UserNotFoundError) return createError(currencyObj);
            if (currencyObj === null) return createError(new CurrencyNotFoundError(refCurrencyId, ownerId));

            const apiUrl = path.join(currencySource.hostname, "/", currencySource.path);
            const method = "GET"; // GET only for now
            const response = await fetch(apiUrl, { method: method });

            if (!response.ok)
                return new ExecuteCurrencyRateSourceError(new FetchError(method, apiUrl, response), refCurrencyId, ownerId);

            const responseStr = await response.text();
            const responseJsonObj = JSON.parse(responseStr);
            const extractedItem = jmespath.search(responseJsonObj, currencySource.jsonQueryString);
            const parsedFloat = parseFloat(extractedItem);

            if (extractedItem === null || extractedItem === undefined || Number.isNaN(parsedFloat))
                return new ExecuteCurrencyRateSourceError(new InvalidNumberError(extractedItem, ownerId), refCurrencyId, ownerId);

            const rateDatum = await CurrencyRateDatumService.createCurrencyRateDatum
            (
                ownerId,
                new Decimal(parsedFloat).toString(),
                nowEpoch,
                currencyObj.id,
                currencySource.refAmountCurrencyId
            );
            if (rateDatum instanceof CurrencyNotFoundError) return createError(new CurrencyNotFoundError(refCurrencyId, ownerId));

            currencySource.lastExecuteTime = nowEpoch;
            await CurrencyRateSourceRepository.getInstance().save(currencySource);

            return unwrap(rateDatum, "rate datum: owner id mismatch.");
        }
        catch(e)
        {
            if (e instanceof Error)
                return new ExecuteCurrencyRateSourceError(e, refCurrencyId, ownerId);

            throw new ExecuteCurrencyRateSourceError(e, refCurrencyId, ownerId).panic();
        }
    }

    public static async deleteCurrencyRateSource(ownerId: string, srcId: string):
        Promise<null | CurrencySrcNotFoundError>
    {
        const whereClause = { ownerId: ownerId ?? null, id: srcId ?? null };

        const originalSrc = await CurrencyRateSourceRepository
        .getInstance()
        .findOne({ where: whereClause });
        if (!originalSrc) return new CurrencySrcNotFoundError(srcId, ownerId);
        await CurrencyRateSourceRepository.getInstance().delete(whereClause);
        return null;
    }
}