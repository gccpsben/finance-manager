import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import { CalculationsService } from '../../db/services/calculations.service.js';
import { GetUserBalanceHistoryAPI, GetUserNetworthHistoryAPI, type ResponseGetExpensesAndIncomesDTO } from '../../../../api-types/calculations.js';
import { ServiceUtils } from '../../db/servicesUtils.js';
import { IsPositiveIntString, IsUTCDateIntString } from '../../db/validators.js';
import { IsOptional } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { TransactionService } from '../../db/services/transaction.service.js';
import { InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import createHttpError from 'http-errors';
import { UserNotFoundError } from '../../db/services/user.service.js';
import { ArgsComparisonError, ConstantComparisonError } from '../../std_errors/argsErrors.js';

const router = new TypesafeRouter(express.Router());

router.get<ResponseGetExpensesAndIncomesDTO>("/api/v1/calculations/expensesAndIncomes",
{
    handler: async (req:express.Request, res:express.Response) =>
    {
        const authResults = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResults instanceof InvalidLoginTokenError) throw createHttpError(401);

        const calResults = await CalculationsService.getUserExpensesAndIncomes30d(authResults.ownerUserId);
        return {
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

        const authResults = await AccessTokenService.validateRequestTokenValidated(req);
        if (authResults instanceof InvalidLoginTokenError) throw createHttpError(401);

        const input =
        {
            // defaults to all
            startDate: reqQuery.startDate ?? (await TransactionService.getUserEarliestTransaction(authResults.ownerUserId)).creationDate,
            endDate: reqQuery.endDate ?? Date.now(),
            division: reqQuery.division ?? 100
        };

        const resultMap = await CalculationsService.getUserNetworthHistory
        (
            authResults.ownerUserId,
            input.startDate,
            input.endDate,
            input.division
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
    handler: async (req: express.Request, res: express.Response) =>
    {
        const authResults = await AccessTokenService.validateRequestTokenValidated(req);
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

        if (calResults instanceof UserNotFoundError) throw createHttpError(401);
        if (calResults instanceof ArgsComparisonError) throw createHttpError(400, calResults.message);
        if (calResults instanceof ConstantComparisonError) throw createHttpError(400, calResults.message);

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