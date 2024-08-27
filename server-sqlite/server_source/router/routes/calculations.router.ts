import express from 'express';
import { AccessTokenService } from '../../db/services/accessToken.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import { CalculationsService } from '../../db/services/calculations.service.js';
import { GetUserBalanceHistoryAPI, type ResponseGetExpensesAndIncomesDTO } from '../../../../api-types/calculations.js';
import { ServiceUtils } from '../../db/servicesUtils.js';

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

router.get<GetUserBalanceHistoryAPI.ResponseDTO>(`/api/v1/calculations/balanceHistory`, 
{
    handler: async (req: express.Request, res: express.Response) => 
    {
        const authResults = await AccessTokenService.ensureRequestTokenValidated(req);
        const calResults = await CalculationsService.getUserBalanceHistory(authResults.ownerUserId);
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