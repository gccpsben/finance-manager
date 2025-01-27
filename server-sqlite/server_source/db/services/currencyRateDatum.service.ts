import { UserNotFoundError, UserService } from "./user.service.ts";
import { CurrencyCalculator, CurrencyNotFoundError } from "./currency.service.ts";
import { Decimal } from "decimal.js";
import { unwrap } from "../../std_errors/monadError.ts";
import { QueryRunner } from "typeorm";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.ts";
import { Database } from "../db.ts";
import { CurrencyCache } from "../caches/currencyListCache.cache.ts";
import { CurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.ts";
import { minAndMax } from "../servicesUtils.ts";
import { UserCache } from '../caches/user.cache.ts';

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
        }[] | UserNotFoundError | CurrencyNotFoundError>
    {
        const userIdToObjMap: { [userID: string]: { id: string; username: string; } } = {};
        const uniqueUserIds = [...new Set(datums.map(x => x.userId))];

        // Check for user-ids
        for (const userId of uniqueUserIds)
        {
            const owner = await UserService.getUserById(userId, userCache);
            if (owner === null) return new UserNotFoundError(userId);
            userIdToObjMap[userId] = owner;
        }

        return await Database.getCurrencyRateDatumRepository()!.createCurrencyRateDatum
        (
            datums,
            queryRunner,
            currencyRateDatumsCache,
            currencyToBaseRateCache,
            currencyCache,
        );
    }

    public static async getCurrencyRateHistory
    (
        ownerId: string,
        currencyId: string,
        startDate: number | undefined = undefined,
        endDate: number | undefined = undefined,
        currencyRateDatumsCache: CurrencyRateDatumsCache | null,
        currencyToBaseRateCache: CurrencyToBaseRateCache | null,
        currencyCache: CurrencyCache | null,
        userCache: UserCache | null,
        division: number = 10
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId, userCache);
        if (userFetchResult === null) return new UserNotFoundError(ownerId);

        const datumsWithinRange = await Database.getCurrencyRateDatumRepository()!
        .getCurrencyDatums(ownerId, currencyId, startDate, endDate, currencyRateDatumsCache);

        if (datumsWithinRange.length === 0)
        {
            return {
                datums: [],
                earliestDatum: undefined,
                latestDatum: undefined
            }
        }

        const datumsStat = minAndMax(datumsWithinRange, x => x.date);
        const interpolator = unwrap(
            await CurrencyCalculator.getCurrencyToBaseRateInterpolator(
                ownerId,
                currencyId,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache,
                userCache
            )
        );

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
                rateToBase: await interpolator.getValue(xValueDecimal) ?? new Decimal("0") // TODO: Properly address this
            });
        }

        return {
            datums: output,
            earliestDatum: datumsStat.minObj,
            latestDatum: datumsStat.maxObj
        };
    }
}