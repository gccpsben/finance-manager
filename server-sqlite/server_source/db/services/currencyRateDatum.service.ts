import { UserService } from "./user.service.js";
import { CurrencyRateDatumRepository, CurrencyRateDatumsCache } from "../repositories/currencyRateDatum.repository.js";
import { CurrencyCalculator, CurrencyService } from "./currency.service.js";
import { Decimal } from "decimal.js";


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
        userId: string,
        amount: string,
        date: number,
        currencyId: string,
        amountCurrencyId: string
    )
    {
        const newRate = CurrencyRateDatumRepository.getInstance().create();
        newRate.amount = amount.toString();
        newRate.date = date;
        newRate.owner = await UserService.getUserById(userId);
        newRate.refCurrency = await CurrencyService.getCurrencyWithoutCache(userId, { id: currencyId });
        newRate.refAmountCurrency = await CurrencyService.getCurrencyWithoutCache(userId, { id: amountCurrencyId })
        return CurrencyRateDatumRepository.getInstance().save(newRate);
    }

    public static async getCurrencyRateHistory
    (
        ownerId: string,
        currencyId: string,
        startDate: Date = undefined, endDate: Date = undefined,
        division: number = 10
    )
    {
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
        const interpolator = await CurrencyCalculator.getCurrencyToBaseRateInterpolator(ownerId, currencyId, undefined, undefined);

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
                rateToBase: interpolator.getValue(xValueDecimal)
            });
        }

        return {
            datums: output,
            earliestDatum: datumsStat.minObj,
            latestDatum: datumsStat.maxObj
        };
    }
}