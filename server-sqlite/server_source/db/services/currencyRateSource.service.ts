import path from "node:path";
import { MonadError, NestableError, NestableErrorSymbol, panic, unwrap } from "../../std_errors/monadError.ts";
import { CurrencyRateSourceRepository } from "../repositories/currencyRateSource.repository.ts";
import { CurrencyNotFoundError } from "./currency.service.ts";
import { UserNotFoundError } from "./user.service.ts";
import { FetchError } from "../../std_errors/netErrors.ts";
import jmespath from 'jmespath';
import { CurrencyRateDatumService } from "./currencyRateDatum.service.ts";
import { Decimal } from "decimal.js";
import { QueryRunner } from "typeorm";
import { Database } from "../db.ts";
import { QUERY_IGNORE } from "../../symbols.ts";
import { CurrencyCache } from "../caches/currencyListCache.cache.ts";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.ts";
import { CurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.ts";
import { UserCache } from '../caches/user.cache';

export class InvalidNumberError extends MonadError<typeof InvalidNumberError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public valueGiven: unknown;
    public userId: string;

    constructor(valueGiven: unknown, userId: string)
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
    [NestableErrorSymbol]: true = true;
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
        currencyCache: CurrencyCache | null
    )
    {
        const newCurrencyRateSource = CurrencyRateSourceRepository.getInstance().create();
        newCurrencyRateSource.hostname = hostname;
        newCurrencyRateSource.ownerId = ownerId;
        newCurrencyRateSource.name = name;
        newCurrencyRateSource.jsonQueryString = jsonQueryString;
        newCurrencyRateSource.path = path;
        newCurrencyRateSource.refAmountCurrencyId = refAmountCurrencyId;
        newCurrencyRateSource.refCurrencyId = refCurrencyId;

        const validationResult = await CurrencyRateSourceService.validateCurrencyRateSource(newCurrencyRateSource, currencyCache);

        if (validationResult === 'RefCurrencyNotFound' || validationResult === 'MissingRefCurrency')
            return new CurrencyNotFoundError(refCurrencyId, ownerId);

        if (validationResult === 'RefAmountCurrencyNotFound' || validationResult === 'MissingAmountCurrency')
            return new CurrencyNotFoundError(refAmountCurrencyId, ownerId);

        const newlySavedSrc = await CurrencyRateSourceRepository.getInstance().save(newCurrencyRateSource);
        if (!newlySavedSrc.id) throw panic(`Newly saved currency rate source contain falsy IDs.`);

        return {
            hostname: newlySavedSrc.hostname,
            id: newlySavedSrc.id!,
            jsonQueryString: newlySavedSrc.jsonQueryString,
            lastExecuteTime: newlySavedSrc.lastExecuteTime,
            name: newlySavedSrc.name,
            ownerId: newlySavedSrc.ownerId,
            path: newlySavedSrc.path,
            refAmountCurrencyId: newlySavedSrc.refAmountCurrencyId,
            refCurrencyId: newlySavedSrc.refCurrencyId
        };
    }

    public static async validateCurrencyRateSource(
        src: { ownerId: string, refCurrencyId: string, refAmountCurrencyId: string },
        currencyCache: CurrencyCache | null
    ): Promise<
        "RefCurrencyNotFound" | "RefAmountCurrencyNotFound" |
        "MissingRefCurrency" | "MissingAmountCurrency" | null
    >
    {
        if (!src.refAmountCurrencyId) return "MissingAmountCurrency";
        if (!src.refCurrencyId) return "MissingRefCurrency";

        const currRepo = Database.getCurrencyRepository()!;

        const refCurrency = await currRepo.findCurrencyByIdNameTickerOne(src.ownerId, src.refCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyCache);
        const refAmountCurrency = await currRepo.findCurrencyByIdNameTickerOne(src.ownerId, src.refAmountCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyCache);

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
    ): Promise<{
        hostname: string,
        id: string,
        jsonQueryString: string,
        lastExecuteTime: number | null,
        name: string,
        ownerId: string,
        refAmountCurrencyId: string,
        refCurrencyId: string,
        path: string
    }[]>
    {
        // TODO: Handle currency not found
        const userCurrencyRateSources = await CurrencyRateSourceRepository
        .getInstance()
        .find({ where: { ownerId: ownerId ?? null, refCurrencyId: currencyId ?? null } });

        if (userCurrencyRateSources.some(x => !x.id))
            throw panic(`CurrencyRateSources queried from database contain falsy IDs.`);

        return userCurrencyRateSources.map(x => ({
            hostname: x.hostname,
            id: x.id!,
            jsonQueryString: x.jsonQueryString,
            lastExecuteTime: x.lastExecuteTime,
            name: x.name,
            ownerId: x.ownerId,
            refAmountCurrencyId: x.refAmountCurrencyId,
            refCurrencyId: x.refCurrencyId,
            path: x.path
        }));
    }

    public static async getCurrencyRatesSourceById
    (
        ownerId: string,
        srcId: string
    ): Promise<{
        hostname: string,
        id: string,
        jsonQueryString: string,
        lastExecuteTime: number | null,
        name: string,
        ownerId: string,
        path: string,
        refAmountCurrencyId: string,
        refCurrencyId: string
    } | null>
    {
        const userCurrencyRateSource = await CurrencyRateSourceRepository
        .getInstance()
        .findOne({ where: { ownerId: ownerId ?? null, id: srcId ?? null } });

        if (!userCurrencyRateSource?.id && !!userCurrencyRateSource)
            throw panic(`CurrencyRateSources queried from database contain falsy IDs.`);

        if (!userCurrencyRateSource) return null;

        return {
            hostname: userCurrencyRateSource.hostname,
            id: userCurrencyRateSource.id!,
            jsonQueryString: userCurrencyRateSource.jsonQueryString,
            lastExecuteTime: userCurrencyRateSource.lastExecuteTime,
            name: userCurrencyRateSource.name,
            ownerId: userCurrencyRateSource.ownerId,
            path: userCurrencyRateSource.path,
            refAmountCurrencyId: userCurrencyRateSource.refAmountCurrencyId,
            refCurrencyId: userCurrencyRateSource.refCurrencyId
        };
    }

    public static async patchUserCurrencyRateSource
    (
        ownerId:string,
        patchArgs: { id: string } & Partial<
        {
            hostname: string,
            jsonQueryString: string,
            name: string,
            path: string,
            refAmountCurrencyId: string
        }>,
        currencyCache: CurrencyCache | null
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

        const validationResult = await CurrencyRateSourceService.validateCurrencyRateSource(originalSrc, currencyCache);
        if (validationResult !== null) return new PatchCurrencySrcValidationError(patchArgs.id, validationResult);

        const newlySavedSrc = await CurrencyRateSourceRepository.getInstance().save(originalSrc);
        return {
            hostname: newlySavedSrc.hostname,
            id: newlySavedSrc.id!,
            jsonQueryString: newlySavedSrc.jsonQueryString,
            lastExecuteTime: newlySavedSrc.lastExecuteTime,
            name: newlySavedSrc.name,
            ownerId: newlySavedSrc.ownerId,
            refAmountCurrencyId: newlySavedSrc.refAmountCurrencyId,
            refCurrencyId: newlySavedSrc.refCurrencyId,
            path: newlySavedSrc.path
        };
    }

    // TODO: Separate this function into Execute and Save.
    /**
     * Execute a currency rate source.
     * This will attempt to fetch the resources via the given source's URL.
     */
    public static async executeCurrencyRateSource
    (
        ownerId: string,
        currencySource:
        {
            refCurrencyId: string,
            ownerId: string | undefined,
            hostname: string,
            path: string,
            jsonQueryString: string,
            refAmountCurrencyId: string,
            lastExecuteTime: number | null
        },
        nowEpoch: number,
        queryRunner: QueryRunner,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null
    ): Promise<{
        amount: string,
        date: number,
        id: string,
        ownerId: string,
        refAmountCurrencyId: string,
        refCurrencyId: string
    }[] |
        ExecuteCurrencyRateSourceError<
            Error |
            CurrencyNotFoundError |
            UserNotFoundError |
            FetchError
        >
    >
    {
        const refCurrencyId = currencySource.refCurrencyId;
        const currRepo = Database.getCurrencyRepository()!;

        try
        {
            const createError = <T extends Error>(err: T) =>
                new ExecuteCurrencyRateSourceError(err, currencySource.refCurrencyId, ownerId);

            const currencyObj = await currRepo.findCurrencyByIdNameTickerOne(ownerId, refCurrencyId, QUERY_IGNORE, QUERY_IGNORE, currencyCache);
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

            const rateDatums = await CurrencyRateDatumService.createCurrencyRateDatum
            (
                [
                    {
                        amount: new Decimal(parsedFloat).toString(),
                        date: nowEpoch,
                        currencyId: currencyObj.id,
                        amountCurrencyId: currencySource.refAmountCurrencyId,
                        userId: ownerId
                    }
                ],
                queryRunner,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache,
                userCache
            );
            if (rateDatums instanceof CurrencyNotFoundError) return createError(new CurrencyNotFoundError(refCurrencyId, ownerId));

            currencySource.lastExecuteTime = nowEpoch;
            await CurrencyRateSourceRepository.getInstance().save(currencySource);

            return unwrap(rateDatums, "rate datum: owner id mismatch.");
        }
        catch(e)
        {
            if (e instanceof Error)
                return new ExecuteCurrencyRateSourceError(e, refCurrencyId, ownerId);

            throw new ExecuteCurrencyRateSourceError(new Error("Generic error: " + e), refCurrencyId, ownerId).panic();
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