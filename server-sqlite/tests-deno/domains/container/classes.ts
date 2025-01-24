// deno-lint-ignore-file no-namespace
import { BalancesHydratedContainerDTO, ContainerDTO, GetContainerAPI, GetContainerTimelineAPI, PostContainerAPI, ValueHydratedContainerDTO } from "../../../../api-types/container.d.ts";
import { IsArray, IsDefined, IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";
import { IsDecimalJSString, IsEpochKeyedMap, IsPassing, IsStringToDecimalJSStringDict, IsUTCDateInt } from "../../../server_source/db/validators.ts";
import { Type } from "class-transformer";
import { validateObjectAgainstModel } from "../../lib/assertions.ts";

export class ContainerDTOClass implements ContainerDTO
{
    @IsString() id!: string;
    @IsString() name!: string;
    @IsUTCDateInt() creationDate!: number;
    @IsString() owner!: string;
}

export class BalancesValueHydratedContainerDTOClass extends ContainerDTOClass implements ValueHydratedContainerDTO, BalancesHydratedContainerDTO
{
    @IsDecimalJSString() value!: string;

    @IsDefined()
    @IsStringToDecimalJSStringDict()
    balances!: { [currencyId: string]: string; };
}

export namespace GetContainerAPIClass
{
    export class RequestDTO implements GetContainerAPI.RequestDTO { }
    export class ResponseDTO implements GetContainerAPI.ResponseDTO
    {
        @IsNumber() rateCalculatedToEpoch!: number;
        @IsNumber() totalItems!: number;
        @IsNumber() startingIndex!: number;
        @IsNumber() endingIndex!: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => BalancesValueHydratedContainerDTOClass)
        rangeItems!: (ValueHydratedContainerDTO & BalancesHydratedContainerDTO)[];
    }
}

export namespace GetContainerTimelineAPIClass
{
    export class RequestDTO implements GetContainerTimelineAPI.RequestDTO {}
    export class TimelineEpochDTO
    {
        @IsObject() @IsStringToDecimalJSStringDict() containerBalance!: {  [currId: string]: string; };
        @IsDecimalJSString() containerWorth!: string;
    }
    export class ResponseDTO implements GetContainerTimelineAPI.ResponseDTO
    {
        @IsObject()
        @IsNotEmpty()
        @IsEpochKeyedMap()
        @IsPassing(async (v: unknown) =>
        {
            // test value is ``{ [key: string]: any }``
            if (typeof v !== 'object') return false;
            for (const entry of Object.entries(v as { [key: string]: any }))
            {
                const validationResults = (await validateObjectAgainstModel(TimelineEpochDTO, entry[1]));
                if (!validationResults.isSuccess) return false;
            }
            return true;
        })
        timeline!: { [epoch: string]: TimelineEpochDTO; };
    }
}

export namespace PostContainerAPIClass
{
    export class RequestDTO implements PostContainerAPI.RequestDTO
    {
        @IsString() name!: string;
    }

    export class ResponseDTO implements PostContainerAPI.ResponseDTO
    {
        @IsString() id!: string;
    }
}