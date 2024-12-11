import { BalancesHydratedContainerDTO, ContainerDTO, GetContainerAPI, PostContainerAPI, ValueHydratedContainerDTO } from "../../../../api-types/container.js";
import { IsArray, IsDefined, IsNumber, IsString, ValidateNested } from "class-validator";
import { IsDecimalJSString, IsStringToDecimalJSStringDict, IsUTCDateInt } from "../../../server_source/db/validators.js";
import { Type } from "class-transformer";

export class ContainerDTOClass implements ContainerDTO
{
    @IsString() id: string;
    @IsString() name: string;
    @IsUTCDateInt() creationDate: number;
    @IsString() owner: string;
}

export class BalancesValueHydratedContainerDTOClass extends ContainerDTOClass implements ValueHydratedContainerDTO, BalancesHydratedContainerDTO
{
    @IsDecimalJSString() value: string;

    @IsDefined()
    @IsStringToDecimalJSStringDict()
    balances: { [currencyId: string]: string; };
}

export namespace GetContainerAPIClass
{
    export class RequestDTO implements GetContainerAPI.RequestDTO { }
    export class ResponseDTO implements GetContainerAPI.ResponseDTO
    {
        @IsNumber() rateCalculatedToEpoch: number;
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => BalancesValueHydratedContainerDTOClass)
        rangeItems: (ValueHydratedContainerDTO & BalancesHydratedContainerDTO)[];
    }
}

export namespace PostContainerAPIClass
{
    export class RequestDTO implements PostContainerAPI.RequestDTO
    {
        @IsString() name: string;
    }

    export class ResponseDTO implements PostContainerAPI.ResponseDTO
    {
        @IsString() id: string;
    }
}