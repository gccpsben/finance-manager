import { CurrencyRateDatumRepository } from "../repositories/currencyRateDatum.repository.js";
import { UserService } from "./user.service.js";
import { CurrencyService } from "./currency.service.js";

export class CurrencyRateDatumService
{
    public static async createCurrencyRateDatum
    (
        userId: string,
        amount: string,
        date: Date,
        currencyId: string
    )
    {
        const newRate = CurrencyRateDatumRepository.getInstance().create();
        newRate.amount = amount.toString();
        newRate.date = date;
        newRate.owner = await UserService.getUserById(userId);
        newRate.refCurrency = await CurrencyService.getCurrency(userId, { id: currencyId });
        return CurrencyRateDatumRepository.getInstance().save(newRate);
    }

}