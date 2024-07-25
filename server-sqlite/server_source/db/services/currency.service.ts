import { Decimal } from "decimal.js";
import { EnvManager } from "../../env.js";
import { CurrencyRepository } from "../repositories/currency.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import createHttpError from "http-errors";

export class CurrencyService
{
    public static async tryGetUserBaseCurrency(userId: string)
    {
        const user = await UserRepository.getInstance().findOne({where: {id: userId}});
        if (!user) throw createHttpError(404, `Cannot find user with id '${userId}'`);
        
        CurrencyRepository.getInstance().findOne( { where: { owner: <any>userId, isBase: true } });
    }

    public static async tryGetCurrencyById(currencyId: string, userId: string): Promise<boolean>
    {
        const currency = await CurrencyRepository.getInstance().findOne({where: { id: currencyId, owner: { id: userId } }});
        return !!currency;
    }

    public static async tryGetCurrencyByName(name: string, userId: string): Promise<boolean>
    {
        const currency = await CurrencyRepository.getInstance().findOne({where: { currencyName: name, owner: { id: userId } }});
        return !!currency;
    }

    public static async createCurrency(userId: string, 
        name: string, 
        amount: Decimal | undefined, 
        refCurrencyId: string | undefined,
        ticker: string)
    {
        // Check refCurrencyId exists if refCurrencyId is defined.
        if (refCurrencyId && !(await CurrencyService.tryGetCurrencyById(refCurrencyId, userId)))
            throw createHttpError(404, `Cannot find ref currency with id '${refCurrencyId}'`);

        if (!!(await CurrencyService.tryGetCurrencyByName(name, userId)))
            throw createHttpError(400, `Currency with name '${name}' already exists.`);

        const newCurrency = CurrencyRepository.getInstance().create();
        newCurrency.currencyName = name;
        newCurrency.owner = <any>userId;
        newCurrency.ticker = ticker;
        newCurrency.refCurrency = <any>refCurrencyId;
        newCurrency.isBase = (amount === undefined && refCurrencyId === undefined);
        newCurrency.amount = amount == undefined ? undefined : amount.toFixed();
        await CurrencyRepository.getInstance().save(newCurrency);
        return newCurrency;
    }
}