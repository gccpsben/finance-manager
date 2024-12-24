import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.js';
import { IsOptional, IsString } from 'class-validator';
import { ExpressValidations } from '../validation.js';
import { ContainerExistsError, ContainerService } from '../../db/services/container.service.js';
import { TypesafeRouter } from '../typescriptRouter.js';
import type { GetContainerAPI, PostContainerAPI } from '../../../../api-types/container.js';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../pagination.js';
import { IsUTCDateIntString } from '../../db/validators.js';
import { ServiceUtils } from '../../db/servicesUtils.js';
import { Decimal } from 'decimal.js';
import createHttpError from 'http-errors';
import { unwrap } from '../../std_errors/monadError.js';
import { UserNotFoundError } from '../../db/services/user.service.js';
import { Database } from '../../db/db.js';
import { QUERY_IGNORE } from '../../symbols.js';
import { GlobalCurrencyToBaseRateCache } from '../../db/caches/currencyToBaseRate.cache.js';
import { GlobalCurrencyCache } from '../../db/caches/currencyListCache.cache.js';
import { GlobalCurrencyRateDatumsCache } from '../../db/caches/currencyRateDatumsCache.cache.js';

const router = new TypesafeRouter(express.Router());

router.get<GetContainerAPI.ResponseDTO>(`/api/v1/containers`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsString() id: string | undefined;
            @IsOptional() @IsString() name: string | undefined;

            /** If this is set, the value of each container will use the rate of each currency's rate at the given date. This defaults to now. */
            @IsOptional() @IsUTCDateIntString() currencyRateDate: string;
        }

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const userQuery =
        {
            start: parsedQuery.start ? parseInt(parsedQuery.start) : undefined,
            end: parsedQuery.end ? parseInt(parsedQuery.end) : undefined,
            name: parsedQuery.name,
            id: parsedQuery.id,
            currencyRateDate: parsedQuery.currencyRateDate ? parseInt(parsedQuery.currencyRateDate) : now
        };

        const response = await PaginationAPIResponseClass.prepareFromQueryItems
        (
            await Database.getContainerRepository()!.getManyContainers(
                authResult.ownerUserId,
                userQuery.id === undefined ? QUERY_IGNORE : userQuery.id,
                userQuery.name === undefined ? QUERY_IGNORE : userQuery.name,
                userQuery.start,
                userQuery.end
            ),
            userQuery.start
        );

        const containerValues = unwrap(await ContainerService.valueHydrateContainers
        (
            authResult.ownerUserId,
            response.rangeItems.map(container => container.id),
            userQuery.currencyRateDate,
            GlobalCurrencyRateDatumsCache,
            GlobalCurrencyToBaseRateCache,
            GlobalCurrencyCache
        ));

        return {
            rateCalculatedToEpoch: userQuery.currencyRateDate,
            totalItems: response.totalItems,
            endingIndex: response.endingIndex,
            startingIndex: response.startingIndex,
            rangeItems: response.rangeItems.map(item => (
            {
                creationDate: item.creationDate,
                id: item.id,
                name: item.name,
                owner: item.ownerId,
                value: (containerValues.values[item.id] ?? new Decimal(`0`)).toString(),
                balances: containerValues.balances[item.id] ? ServiceUtils.mapObjectValues
                (
                    containerValues.balances[item.id],
                    x => x.toString()
                ) : {}
            }))
        };
    }
});

router.post<PostContainerAPI.ResponseDTO>(`/api/v1/containers`,
{
    handler: async (req: express.Request, res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class body implements PostContainerAPI.RequestDTO { @IsString() name: string; }

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const containerCreated = await ContainerService.createContainer(authResult.ownerUserId, parsedBody.name);
        if (containerCreated instanceof ContainerExistsError) throw createHttpError(400, `Container with name '${containerCreated.containerName}' already exists.`);
        if (containerCreated instanceof UserNotFoundError) throw createHttpError(401);

        return { id: containerCreated.id }
    }
})

export default router.getRouter();