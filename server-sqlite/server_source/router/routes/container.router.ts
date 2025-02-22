import express from 'express';
import { AccessTokenService, InvalidLoginTokenError } from '../../db/services/accessToken.service.ts';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ExpressValidations } from '../validation.ts';
import { ContainerExistsError, ContainerNotFoundError, ContainerService } from '../../db/services/container.service.ts';
import { TypesafeRouter } from '../typescriptRouter.ts';
import type { GetContainerAPI, GetContainerTimelineAPI, PostContainerAPI } from '../../../../api-types/container.d.ts';
import { OptionalPaginationAPIQueryRequest, PaginationAPIResponseClass } from '../pagination.ts';
import { IsIntString, IsUTCDateIntString } from '../../db/validators.ts';
import { Decimal } from 'decimal.js';
import createHttpError from 'http-errors';
import { unwrap } from '../../std_errors/monadError.ts';
import { UserNotFoundError } from '../../db/services/user.service.ts';
import { Database } from '../../db/db.ts';
import { QUERY_IGNORE } from '../../symbols.ts';
import { GlobalCurrencyToBaseRateCache } from '../../db/caches/currencyToBaseRate.cache.ts';
import { GlobalCurrencyCache } from '../../db/caches/currencyListCache.cache.ts';
import { GlobalCurrencyRateDatumsCache } from '../../db/caches/currencyRateDatumsCache.cache.ts';
import { CalculationsService } from '../../db/services/calculations.service.ts';
import { LinearStepper } from '../../calculations/linearStepper.ts';
import { CurrencyService } from '../../db/services/currency.service.ts';
import { mapObjectValues } from "../../db/servicesUtils.ts";
import { GlobalUserCache } from "../../db/caches/user.cache.ts";
import { UUID } from 'node:crypto';

const router = new TypesafeRouter(express.Router());

router.get<GetContainerAPI.ResponseDTO>(`/api/v1/containers`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query extends OptionalPaginationAPIQueryRequest
        {
            @IsOptional() @IsUUID(4) @IsString() id: UUID | undefined;
            @IsOptional() @IsString() name: string | undefined;

            /** If this is set, the value of each container will use the rate of each currency's rate at the given date. This defaults to now. */
            @IsOptional() @IsUTCDateIntString() currencyRateDate!: string;
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
            GlobalCurrencyCache,
            GlobalUserCache
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
                balances: containerValues.balances[item.id] ? mapObjectValues
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
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class body implements PostContainerAPI.RequestDTO { @IsString() name!: string; }

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const containerCreated = await ContainerService.createContainer(authResult.ownerUserId, parsedBody.name);
        if (containerCreated instanceof ContainerExistsError) throw createHttpError(400, `Container with name '${containerCreated.containerName}' already exists.`);
        if (containerCreated instanceof UserNotFoundError) throw createHttpError(401);

        return { id: containerCreated.id }
    }
});

router.get<GetContainerTimelineAPI.ResponseDTO>(`/api/v1/containers/timeline`,
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query implements GetContainerTimelineAPI.RequestQueryDTO
        {
            @IsNotEmpty() @IsUUID(4) @IsString() containerId!: UUID;
            @IsOptional() @IsIntString() division?: string | undefined;
            @IsOptional() @IsIntString() endDate?: string | undefined;
            @IsOptional() @IsIntString() startDate?: string | undefined;
        }

        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        const timeline = (await CalculationsService.getContainersWorthHistory
        (
            authResult.ownerUserId,
            [parsedQuery.containerId],
            GlobalCurrencyRateDatumsCache,
            GlobalCurrencyToBaseRateCache,
            GlobalCurrencyCache,
            GlobalUserCache
        ));

        if (timeline instanceof ContainerNotFoundError) throw createHttpError(404, timeline.message);

        const userQuery =
        {
            containerId: parsedQuery.containerId,
            division: parsedQuery.division === undefined ? 500 : parseInt(parsedQuery.division),
            startDate: parsedQuery.startDate === undefined ? undefined : parseInt(parsedQuery.startDate),
            endDate: parsedQuery.endDate === undefined ? undefined : parseInt(parsedQuery.endDate)
        };

        const output: GetContainerTimelineAPI.ResponseDTO = { timeline: {} };
        const balanceStepper = LinearStepper.fromEntriesWithMapper
        (
            timeline[parsedQuery.containerId],
            entry => ({ key: new Decimal(entry.txn.creationDate), value: entry.containerBalance })
        );

        const earliestEpoch = balanceStepper.getMinKey();
        const latestEpoch = balanceStepper.getMaxKey();
        if (!earliestEpoch || !latestEpoch) throw createHttpError(400, "Cannot find a reasonable start and end. Please provide one in the request.") // TODO: handle

        const rangeStart: Decimal = userQuery.startDate === undefined ? earliestEpoch : new Decimal(userQuery.startDate);
        const rangeEnd: Decimal = userQuery.endDate === undefined ? new Decimal(Date.now()) : new Decimal(userQuery.endDate);
        const divisionEpoch = (rangeEnd.sub(rangeStart)).div(userQuery.division);

        for (let divisionIndex = 0; divisionIndex < userQuery.division; divisionIndex++)
        {
            const currentDivisionEpoch = rangeStart.add(divisionEpoch.mul(divisionIndex)).round().clamp(rangeStart, rangeEnd);
            const balanceAtDivisionEpoch = balanceStepper.getValue(currentDivisionEpoch, {}) ?? {};
            const worthAtDivisionEpoch = await CurrencyService.getWorthOfBalances
            (
                authResult.ownerUserId,
                currentDivisionEpoch.toNumber(),
                balanceAtDivisionEpoch,
                GlobalCurrencyRateDatumsCache,
                GlobalCurrencyToBaseRateCache,
                GlobalCurrencyCache,
                GlobalUserCache
            )

            output.timeline[currentDivisionEpoch.toString()] = {
                containerBalance: mapObjectValues(balanceAtDivisionEpoch, d => d.toString()),
                containerWorth: worthAtDivisionEpoch.totalWorth.toString()
            }
        }

        return output;
    }
});

export default router.getRouter();