import { Decimal } from "decimal.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import createHttpError from "http-errors";
import { Currency } from "../entities/currency.entity.js";
import { FindOptionsWhere } from "typeorm";

export class CurrencyCalculator
{
    public static async currencyToCurrencyRate(ownerId:string, from: Currency, to: Currency)
    {
        const fromRate = await this.currencyToBaseRate(ownerId, from);
        const toRate = await this.currencyToBaseRate(ownerId, to);
        return fromRate.dividedBy(toRate);
    }

    public static async currencyToBaseRate(ownerId: string, from: Currency)
    { 
        const fromCurrency = from;
        let currentCurrency = fromCurrency;
        let rate = fromCurrency.amount ? new Decimal(fromCurrency.amount) : new Decimal("1");
        for (let i = 0; i < 999; i++)
        { 
            // This will only happens when the currency definition is later changed.
            if (i >= 100) { throw new Error(`Max retry. Possibly infinite loop in currency definition.`); }
            if (!currentCurrency.refCurrency) break;
            currentCurrency = await CurrencyService.getCurrency(ownerId, { name: currentCurrency.refCurrency.name })!;
            rate = rate.mul(currentCurrency.amount ? new Decimal(currentCurrency.amount) : new Decimal("1"));
        }
        return rate;
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

    // public static async 
}