import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";
import { GetTxnTagsAPI, TxnTagsDTO } from "../../../../api-types/txnTag.d.ts";
import { Type } from "class-transformer";

export class TransactionTagsDTOClass implements TxnTagsDTO
{
    @IsString() id: string;
    @IsString() owner: string;
    @IsString() name: string;
}

export namespace GetTxnTagsAPIClass
{
    export class ResponseDTOClass implements GetTxnTagsAPI.ResponseDTO
    {
        @IsNumber() totalItems: number;
        @IsNumber() startingIndex: number;
        @IsNumber() endingIndex: number;

        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => TransactionTagsDTOClass)
        rangeItems: TransactionTagsDTOClass[];
    }
}

// This class is to add validation decorators to the api-types defined
export class ResponsePostTxnTagsDTOBody extends TransactionTagsDTOClass {}