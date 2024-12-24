import { UserNotFoundError, UserService } from "./user.service.js";
import { CurrencyCalculator, CurrencyNotFoundError, CurrencyService } from "./currency.service.js";
import { Decimal } from "decimal.js";
import { unwrap } from "../../std_errors/monadError.js";
import { QueryRunner } from "typeorm";
import { User } from "../entities/user.entity.js";
import { CurrencyToBaseRateCache, GlobalCurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { Database } from "../db.js";


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
    ): Promise<{
            amount: string,
            date: number,
            id: string,
            ownerId: string,
            refAmountCurrencyId: string,
            refCurrencyId: string
        }[] | UserNotFoundError | CurrencyNotFoundError>
    {
        let userIdToObjMap: { [userID: string]: User } = {};
        let uniqueUserIds = [...new Set(datums.map(x => x.userId))];

        // Check for user-ids
        for (let userId of uniqueUserIds)
        {
            const owner = await UserService.getUserById(userId);
            if (owner === null) return new UserNotFoundError(userId);
            userIdToObjMap[userId] = owner;
        }

        return await Database.getCurrencyRateDatumRepository()!.createCurrencyRateDatum(datums, queryRunner, cache);
    }

    public static async getCurrencyRateHistory
    (
        ownerId: string,
        currencyId: string,
        startDate: number | undefined = undefined,
        endDate: number | undefined = undefined,
        division: number = 10
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const datumsWithinRange = await Database.getCurrencyRateDatumRepository()!.getCurrencyDatums(ownerId, currencyId, startDate, endDate);

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