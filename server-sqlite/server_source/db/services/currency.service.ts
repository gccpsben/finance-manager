import { Decimal } from "decimal.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import createHttpError from "http-errors";
import { Currency, RateHydratedCurrency } from "../entities/currency.entity.js";
import { FindOptionsWhere } from "typeorm";
import { CurrencyRateDatumRepository } from "../repositories/currencyRateDatum.repository.js";
import { LinearInterpolator } from "../../calculations/linearInterpolator.js";

export class CurrencyCalculator
{
    public static async currencyToCurrencyRate(ownerId:string, from: Currency, to: Currency)
    {
        const fromRate = await this.currencyToBaseRate(ownerId, from);
        const toRate = await this.currencyToBaseRate(ownerId, to);
        return fromRate.dividedBy(toRate);
    }

    /** 
     * Get the rate of `<target_currency>` to `<base_currency>` at the given date using the rates of the currency stored in database. 
     * #### *if the rates at the given datetime are not available in the database, will use the fallback rate (`Currency.rateToBase`) instead.
    */
    public static async currencyToBaseRate(ownerId: string, from: Currency, date: Date = new Date()): Promise<Decimal>
    { 
        if (from.isCurrencyBase()) return new Decimal(`1`);
    
        const getCurrById = async (id: string) => await CurrencyService.getCurrencyById(ownerId, id);
        const nearestTwoDatums = await CurrencyRateDatumRepository.getInstance().findNearestTwoDatum(ownerId, from.id, date);
        const d1 = nearestTwoDatums[0]; const d2 = nearestTwoDatums[1];

        if (nearestTwoDatums.length === 0) 
        {
            // console.log(`1 from: ${JSON.stringify(from)}`);
            const currenyBaseAmount = new Decimal(from.amount);
            const currenyBaseAmountUnitToBaseRate = await CurrencyCalculator.currencyToBaseRate(ownerId, await getCurrById(from.refCurrencyId), date)!;
            return currenyBaseAmount.mul(currenyBaseAmountUnitToBaseRate);
        }

        if (nearestTwoDatums.length === 1) 
        {
            console.log(`2 from: ${JSON.stringify(from)}`);
            console.log(`2: ${d1.amount}`);
            const datumAmount = new Decimal(d1.amount);
            const datumUnitToBaseRate = await CurrencyCalculator.currencyToBaseRate(ownerId, await getCurrById(d1.refAmountCurrencyId), new Date(d1.date))!;
            return datumAmount.mul(datumUnitToBaseRate);
        }

        else // if (nearestTwoDatums.length === 2)
        {
            const isDateBeforeD1D2 = date.getTime() < d1.date && date.getTime() < d2.date; // ....^..|....|........
            const isDateAfterD1D2 = date.getTime() > d1.date && date.getTime() > d2.date;  // .......|....|...^....
    
            let valLeft: Decimal = new Decimal("0");
            let valRight: Decimal = new Decimal("0");
            valLeft = new Decimal(d1.amount).mul(await CurrencyCalculator.currencyToBaseRate(ownerId, await getCurrById(d1.refAmountCurrencyId), new Date(d1.date))!);
            valRight = new Decimal(d2.amount).mul(await CurrencyCalculator.currencyToBaseRate(ownerId, await getCurrById(d2.refAmountCurrencyId), new Date(d2.date))!);    
            if (isDateBeforeD1D2 || isDateAfterD1D2) return valLeft;
            if (valLeft === valRight) return valLeft;
    
            const midPt = LinearInterpolator.fromEntries
            (
                [
                    { key: d1.date, value: valLeft },
                    { key: d2.date, value: valRight },
                ],
                item => new Decimal(item.key),
                item => item.value
            ).getValue(new Decimal(date.getTime()));
            return midPt;
        }
    }
};

export class CurrencyService
{
    public static async tryGetUserBaseCurrency(userId: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: userId }});
        if (!user) throw createHttpError(404, `Cannot find user with id '${userId}'`);
        
        return await CurrencyRepository.getInstance().findOne( 
        { 
            where: 
            { 
                owner: { id: userId }, 
                isBase: true,
            },
            relations: { owner: true, refCurrency: true } 
        });
    }

    public static async getUserCurrencies(userId: string)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: userId }});
        if (!user) throw createHttpError(404, `Cannot find user with id '${userId}'`);

        const results = await CurrencyRepository.getInstance()
        .createQueryBuilder(`currency`)
        .where(`currency.ownerId = :ownerId`, { ownerId: userId })
        .getMany();

        return results;
    }

    public static async getCurrencyById(userId:string, currencyId: string)
    {
        return await this.getCurrency(userId, { id: currencyId ?? null });
    }

    public static async getCurrency(userId: string, where: Omit<FindOptionsWhere<Currency>, 'owner'>)
    {
        const user = await UserRepository.getInstance().findOne({where: { id: userId }});
        if (!user) throw createHttpError(404, `Cannot find user with id '${userId}'`);

        const result = await CurrencyRepository.getInstance().findOne(
        {
            where: { ...where, owner: { id: userId } },
            relations: { owner: true, refCurrency: true }
        });

        if (!result) throw createHttpError(404, `Cannot find currency with query \"${JSON.stringify(where)}\"'`);
        return result;
    }

    public static async createCurrency(userId: string, 
        name: string, 
        amount: Decimal | undefined, 
        refCurrencyId: string | undefined,
        ticker: string)
    {
        // if (!!refCurrencyId !== !!amount)
        //     throw createHttpError(400, `If refCurrency is defined than amount must also be defined.`);

        // Check refCurrencyId exists if refCurrencyId is defined.
        if (refCurrencyId && !(await CurrencyRepository.getInstance().isCurrencyByIdExists(refCurrencyId, userId)))
            throw createHttpError(404, `Cannot find ref currency with id '${refCurrencyId}'`);

        if (!!(await CurrencyRepository.getInstance().isCurrencyByNameExists(name, userId)))
            throw createHttpError(400, `Currency with name '${name}' already exists.`);

        if (!!(await CurrencyRepository.getInstance().isCurrencyByTickerExists(ticker, userId)))
            throw createHttpError(400, `Currency with ticker '${ticker}' already exists.`);

        const newCurrency = CurrencyRepository.getInstance().create();
        newCurrency.name = name;
        newCurrency.owner = await UserRepository.getInstance().findOne({where:{id: userId}});
        newCurrency.ticker = ticker;
        if (refCurrencyId)
            newCurrency.refCurrency = await CurrencyRepository.getInstance().findOne({where:{id: refCurrencyId}});
        newCurrency.isBase = (amount === undefined && refCurrencyId === undefined);
        newCurrency.amount = amount == undefined ? undefined : amount.toFixed();
        await CurrencyRepository.getInstance().save(newCurrency);
        return newCurrency;
    }

    public static async rateHydrateCurrency(userId:string, currency: Currency[], date: number | undefined): Promise<RateHydratedCurrency[]>
    public static async rateHydrateCurrency(userId:string, currency: Currency, date: number | undefined): Promise<RateHydratedCurrency>
    public static async rateHydrateCurrency(userId:string, currencies: Currency[] | Currency, date: number | undefined = undefined): Promise<RateHydratedCurrency | RateHydratedCurrency[]>
    {
        type outputType = { currency: Currency, rateToBase: string };
        const getRateToBase = async (c: Currency) => (await CurrencyCalculator.currencyToBaseRate(userId, c, new Date(date))).toString();

        if (Array.isArray(currencies))
        {
            const output: outputType[] = [];
            for (const currency of currencies)
            {
                output.push({
                    currency: currency,
                    rateToBase: await getRateToBase(currency)
                });
            }
            return output;
        }
        else
        {
            return {
                currency: currencies,
                rateToBase: await getRateToBase(currencies)
            }
        }
    }
}