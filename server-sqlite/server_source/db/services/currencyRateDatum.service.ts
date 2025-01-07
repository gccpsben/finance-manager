import { UserNotFoundError, UserService } from "./user.service.js";
import { CurrencyCalculator, CurrencyNotFoundError } from "./currency.service.js";
import { Decimal } from "decimal.js";
import { unwrap } from "../../std_errors/monadError.js";
import { QueryRunner } from "typeorm";
import { User } from "../entities/user.entity.js";
import { CurrencyToBaseRateCache } from "../caches/currencyToBaseRate.cache.js";
import { Database } from "../db.js";
import { CurrencyCache } from "../caches/currencyListCache.cache.js";
import { CurrencyRateDatumsCache } from "../caches/currencyRateDatumsCache.cache.js";
import { ServiceUtils } from "../servicesUtils.js";

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
        currencyCache: CurrencyCache | null
    ): Promise<{
            amount: string,
            date: number,
            id: string,
            ownerId: string,
            refAmountCurrencyId: string,
            refCurrencyId: string
        }[] | UserNotFoundError | CurrencyNotFoundError>
    {
        let userIdToObjMap: { [userID: string]: { id: string; username: string; } } = {};
        let uniqueUserIds = [...new Set(datums.map(x => x.userId))];

        // Check for user-ids
        for (let userId of uniqueUserIds)
        {
            const owner = await UserService.getUserById(userId);
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
        division: number = 10
    )
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(ownerId);
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

        const datumsStat = ServiceUtils.minAndMax(datumsWithinRange, x => x.date);
        const interpolator = unwrap(
            await CurrencyCalculator.getCurrencyToBaseRateInterpolator(
                ownerId,
                currencyId,
                currencyRateDatumsCache,
                currencyToBaseRateCache,
                currencyCache
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