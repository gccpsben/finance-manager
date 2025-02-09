import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.ts';
import { mapObjectValues } from "../../db/servicesUtils.ts";
import { TypesafeRouter } from '../typescriptRouter.ts';
import { CalculationsService } from '../../db/services/calculations.service.ts';
import type { GetExpensesAndIncomesAPI, GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI } from '../../../../api-types/calculations.d.ts';
import { IsPositiveIntString, IsUTCDateIntString } from '../../db/validators.ts';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { ExpressValidations } from '../validation.ts';
import { InvalidLoginTokenError } from '../../db/services/accessToken.service.ts';
import createHttpError from 'http-errors';
import { UserNotFoundError } from '../../db/services/user.service.ts';
import { ArgsComparisonError, ConstantComparisonError } from '../../std_errors/argsErrors.ts';
import { GlobalCurrencyToBaseRateCache } from '../../db/caches/currencyToBaseRate.cache.ts';
import { GlobalCurrencyCache } from '../../db/caches/currencyListCache.cache.ts';
import { GlobalCurrencyRateDatumsCache } from '../../db/caches/currencyRateDatumsCache.cache.ts';
import { Database } from '../../db/db.ts';
import { GlobalUserCache } from '../../db/caches/user.cache.ts';

const router = new TypesafeRouter(express.Router());

router.get<GetExpensesAndIncomesAPI.ResponseDTO>("/api/v1/calculations/expensesAndIncomes",
{
    handler: async (req:express.Request, _res:express.Response) =>
    {
        const now = Date.now();
        const authResults = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResults instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query implements GetExpensesAndIncomesAPI.RequestQueryDTO
        {
            @IsNotEmpty() @IsUTCDateIntString() currentMonthStartEpoch!: string;
            @IsNotEmpty() @IsUTCDateIntString() currentWeekStartEpoch!: string;
        }
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);

        const _30dKey = "30d";
        const _7dKey = "7d";
        const _currentWeekKey = "week";
        const _currentMonthKey = "month";

        const calResults = await CalculationsService.getExpensesAndIncomesOfTimeRanges
        (
            authResults.ownerUserId,
            {
                [_30dKey]: { epoch: now - 2.592e+9, mode: 'AT_OR_AFTER' },
                [_7dKey]: { epoch: now - 6.048e+8, mode: 'AT_OR_AFTER' },
                [_currentMonthKey]: { epoch: parseInt(parsedQuery.currentMonthStartEpoch), mode: 'AT_OR_AFTER' },
                [_currentWeekKey]: { epoch: parseInt(parsedQuery.currentWeekStartEpoch), mode: 'AT_OR_AFTER' },
            },
            now,
            GlobalCurrencyRateDatumsCache,
            GlobalCurrencyToBaseRateCache,
            GlobalCurrencyCache,
            GlobalUserCache
        );
        return {
            expenses30d: calResults[_30dKey].expenses.toString(),
            incomes30d: calResults[_30dKey].incomes.toString(),
            expenses7d: calResults[_7dKey].expenses.toString(),
            incomes7d: calResults[_7dKey].incomes.toString(),
            expensesCurrentMonth: calResults[_currentMonthKey].expenses.toString(),
            incomesCurrentMonth: calResults[_currentMonthKey].incomes.toString(),
            expensesCurrentWeek: calResults[_currentWeekKey].expenses.toString(),
            incomesCurrentWeek: calResults[_currentWeekKey].incomes.toString(),
        }
    }
});

router.get<GetUserNetworthHistoryAPI.ResponseDTO>(`/api/v1/calculations/networthHistory`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResults = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResults instanceof InvalidLoginTokenError) throw createHttpError(401);

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

        const userEarliestTxn = await Database.getTransactionRepository()!.getUserEarliestTransaction(authResults.ownerUserId);

        const input =
        {
            // defaults to all
            startDate: reqQuery.startDate ?? (userEarliestTxn ? userEarliestTxn.creationDate : now),
            endDate: reqQuery.endDate ?? now,
            division: reqQuery.division ?? 100
        };

        const resultMap = await CalculationsService.getUserNetworthHistory
        (
            authResults.ownerUserId,
            input.startDate,
            input.endDate,
            input.division,
            GlobalCurrencyRateDatumsCache,
            GlobalCurrencyToBaseRateCache,
            GlobalCurrencyCache,
            GlobalUserCache
        );

        if (resultMap instanceof UserNotFoundError) throw createHttpError(401);
        if (resultMap instanceof ArgsComparisonError) throw createHttpError(400, resultMap.message);
        if (resultMap instanceof ConstantComparisonError) throw createHttpError(400, resultMap.message);

        return {
            map: resultMap
        }
    }
});

router.get<GetUserBalanceHistoryAPI.ResponseDTO>(`/api/v1/calculations/balanceHistory`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResults = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResults instanceof InvalidLoginTokenError) throw createHttpError(401);

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
            startDate: reqQuery.startDate ?? now - 2.592e+9, // 30d
            endDate: reqQuery.endDate ?? now,
            division: reqQuery.division ?? 100
        };

        const calResults = await CalculationsService.getUserBalanceHistory
        (
            authResults.ownerUserId,
            input.startDate,
            input.endDate,
            input.division
        );

        if (calResults instanceof UserNotFoundError) throw createHttpError(401);
        if (calResults instanceof ArgsComparisonError) throw createHttpError(400, calResults.message);
        if (calResults instanceof ConstantComparisonError) throw createHttpError(400, calResults.message);

        return (() =>
        {
            const outputMap: {[key: string]: {[key: string]: string}} = {};
            for (const epoch of Object.keys(calResults.historyMap))
                outputMap[epoch] = mapObjectValues(calResults.historyMap[epoch], decimal => decimal.toString());
            return {
                map: outputMap
            };
        })();
    }
});

export default router.getRouter();