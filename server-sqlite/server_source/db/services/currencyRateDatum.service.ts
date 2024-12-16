import { UserNotFoundError, UserService } from "./user.service.js";
import { CurrencyRateDatumRepository } from "../repositories/currencyRateDatum.repository.js";
import { CurrencyCalculator, CurrencyNotFoundError, CurrencyService } from "./currency.service.js";
import { Decimal } from "decimal.js";
import { CurrencyRateDatum } from "../entities/currencyRateDatum.entity.js";
import { panic, unwrap } from "../../std_errors/monadError.js";
import { IdBound } from "../../index.d.js";
import { QueryRunner } from "typeorm";
import { User } from "../entities/user.entity.js";
import { CurrencyToBaseRateCache, GlobalCurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";


function minAndMax<T> (array: T[], getter: (obj:T) => number)
{
    let lowest = Number.POSITIVE_INFINITY;
    let highest = Number.NEGATIVE_INFINITY;
    let lowestObj: T | undefined = undefined;
    let highestObj: T | undefined = undefined;
    let arrayLength = array.length;
    for (let i = 0; i < arrayLength; i++)
    {
        let obj = array[i];
        let objValue = getter(obj);

        if (objValue >= highest)
        {
            highest = objValue;
            highestObj = obj;
        }
        if (objValue <= lowest)
        {
            lowest = objValue;
            lowestObj = obj;
        }
    }
    return { minObj: lowestObj, maxObj: highestObj, min: lowest, max: highest }
}

export class CurrencyRateDatumService
{
    public static async createCurrencyRateDatum
    (
        datums:
        {
            userId: string,
            amount: string,
            date: number,
            currencyId: string,
            amountCurrencyId: string
        }[],
        queryRunner: QueryRunner,
        cache: CurrencyToBaseRateCache | undefined = GlobalCurrencyToBaseRateCache
    ): Promise<IdBound<CurrencyRateDatum>[] | UserNotFoundError | CurrencyNotFoundError>
    {
        let savedDatums: IdBound<CurrencyRateDatum>[] = [];
        let uniqueUserIds = [...new Set(datums.map(x => x.userId))];
        let userIdToObjMap: { [userID: string]: User } = {};

        // Check for user-ids
        for (let userId of uniqueUserIds)
        {
            const owner = await UserService.getUserById(userId);
            if (owner === null) return new UserNotFoundError(userId);
            userIdToObjMap[userId] = owner;
        }

        for (let datum of datums)
        {
            cache?.invalidateCurrencyToBase(datum.userId, datum.currencyId);

            const newRate = queryRunner.manager.getRepository(CurrencyRateDatum).create();
            newRate.amount = datum.amount.toString();
            newRate.date = datum.date;
            newRate.owner = userIdToObjMap[datum.userId];

            const refCurrency = await CurrencyService.getCurrencyWithoutCache(datum.userId, { id: datum.currencyId });
            const refAmountCurrency = await CurrencyService.getCurrencyWithoutCache(datum.userId, { id: datum.amountCurrencyId });
            if (refAmountCurrency instanceof UserNotFoundError) return refAmountCurrency;
            if (refCurrency instanceof UserNotFoundError) return refCurrency;
            if (refCurrency === null) return new CurrencyNotFoundError(datum.userId, datum.currencyId);
            if (refAmountCurrency === null) return new CurrencyNotFoundError(datum.userId, datum.amountCurrencyId);

            newRate.refCurrency = refCurrency;
            newRate.refAmountCurrency = refAmountCurrency;
            const newlySavedDatum = await CurrencyRateDatumRepository.getInstance().save(newRate);
            if (!newlySavedDatum.id) throw panic(`Newly saved currency rate datum contains falsy IDs.`);
            savedDatums.push(newlySavedDatum as IdBound<typeof newlySavedDatum>);
        }

        return savedDatums;
    }

    public static async getCurrencyRateHistory
    (
        ownerId: string,
        currencyId: string,
        startDate: Date | undefined = undefined, endDate: Date | undefined = undefined,
        division: number = 10
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const datumsWithinRange = await CurrencyRateDatumRepository.getInstance().getCurrencyDatums(ownerId, currencyId, startDate, endDate);

        if (datumsWithinRange.length <= 1)
        {
            return {
                datums: [],
                earliestDatum: undefined,
                latestDatum: undefined
            }
        }

        const datumsStat = minAndMax(datumsWithinRange, x => x.date);
        const interpolator = unwrap(await CurrencyCalculator.getCurrencyToBaseRateInterpolator(ownerId, currencyId, undefined, undefined));

        const output: {date: number, rateToBase: Decimal}[] = [];
        const minDate = new Decimal(datumsStat.min);
        const maxDate = new Decimal(datumsStat.max);

        const step = maxDate.sub(minDate).dividedBy(division);
        for (let i = 0; i < division; i++)
        {
            const xValueDecimal = minDate.add(step.mul(i)).round();
            output.push(
            {
                date: xValueDecimal.toNumber(),
                rateToBase: interpolator.getValue(xValueDecimal) ?? new Decimal("0") // TODO: Properly address this
            });
        }

        return {
            datums: output,
            earliestDatum: datumsStat.minObj,
            latestDatum: datumsStat.maxObj
        };
    }
}