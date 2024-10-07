import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import { CalculationsService } from '../../db/services/calculations.service.js';
import { GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI, type ResponseGetExpensesAndIncomesDTO } from '../../../../api-types/calculations.js';
import { ServiceUtils } from '../../db/servicesUtils.js';
import { IsPositiveIntString, IsUTCDateIntString } from '../../db/validators.js';
import { IsOptional } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { CurrencyListCache } from '../../db/caches/currencyListCache.cache.js';
import { CurrencyRateDatumsCache } from '../../db/repositories/currencyRateDatum.repository.js';

const router = new TypesafeRouter(express.Router());

router.get<ResponseGetExpensesAndIncomesDTO>("/api/v1/calculations/expensesAndIncomes",
{
    handler: async (req:express.Request, res:express.Response) =>
    {
        const authResults = await AccessTokenService.ensureRequestTokenValidated(req);
        const calResults = await CalculationsService.getUserExpensesAndIncomes(authResults.ownerUserId);
        return {
            expensesTotal: calResults.total.expenses.toString(),
            incomesTotal: calResults.total.incomes.toString(),
            expenses30d: calResults.total30d.expenses.toString(),
            incomes30d: calResults.total30d.incomes.toString(),
            expenses7d: calResults.total7d.expenses.toString(),
            incomes7d: calResults.total7d.incomes.toString()
        }
    }
});

router.get<GetUserNetworthHistoryAPI.ResponseDTO>(`/api/v1/calculations/networthHistory`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        class query implements GetUserNetworthHistoryAPI.RequestQueryDTO
        {
            @IsOptional() @IsUTCDateIntString() startDate: string | undefined;
            @IsOptional() @IsUTCDateIntString() endDate: string | undefined;
            @IsOptional() @IsPositiveIntString() division: string | undefined;
        }
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const reqQuery =
        {
            startDate: parsedQuery.startDate === undefined ? undefined : parseInt(parsedQuery.startDate),
            endDate: parsedQuery.endDate === undefined ? undefined : parseInt(parsedQuery.endDate),
            division: parsedQuery.division === undefined ? undefined : parseInt(parsedQuery.division),
        };
        const input =
        {
            startDate: reqQuery.startDate ?? Date.now() - 2.592e+9, // 30d
            endDate: reqQuery.endDate ?? Date.now(),
            division: reqQuery.division ?? 100
        };

        const authResults = await AccessTokenService.ensureRequestTokenValidated(req);
        const currenciesListCache = new CurrencyListCache(authResults.ownerUserId);
        const currenciesRateDatumsCache = new CurrencyRateDatumsCache(authResults.ownerUserId);

        const resultMap = await CalculationsService.getUserNetworthHistory
        (
            authResults.ownerUserId,
            input.startDate,
            input.endDate,
            input.division,
            currenciesListCache,
            currenciesRateDatumsCache
        );

        return {
            map: resultMap
        }
    }
});

router.get<GetUserBalanceHistoryAPI.ResponseDTO>(`/api/v1/calculations/balanceHistory`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const authResults = await AccessTokenService.ensureRequestTokenValidated(req);

        class query implements GetUserBalanceHistoryAPI.RequestQueryDTO
        {
            @IsOptional() @IsUTCDateIntString() startDate: string | undefined;
            @IsOptional() @IsUTCDateIntString() endDate: string | undefined;
            @IsOptional() @IsPositiveIntString() division: string | undefined;
        }
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const reqQuery =
        {
            startDate: parsedQuery.startDate === undefined ? undefined : parseInt(parsedQuery.startDate),
            endDate: parsedQuery.endDate === undefined ? undefined : parseInt(parsedQuery.endDate),
            division: parsedQuery.division === undefined ? undefined : parseInt(parsedQuery.division),
        };

        const input =
        {
            startDate: reqQuery.startDate ?? Date.now() - 2.592e+9, // 30d
            endDate: reqQuery.endDate ?? Date.now(),
            division: reqQuery.division ?? 100
        };

        const calResults = await CalculationsService.getUserBalanceHistory
        (
            authResults.ownerUserId,
            input.startDate,
            input.endDate,
            input.division
        );

        return (() =>
        {
            const outputMap = {};
            for (const epoch of Object.keys(calResults.historyMap))
                outputMap[epoch] = ServiceUtils.mapObjectValues(calResults.historyMap[epoch], decimal => decimal.toString());
            return {
                map: outputMap
            };
        })();
    }
});

export default router.getRouter();