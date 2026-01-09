import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class TransferItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CreateStockTransferDto {
    @IsString()
    @IsNotEmpty()
    fromBranchId: string; // Frontend se ye name match hona chahiye

    @IsString()
    @IsNotEmpty()
    toBranchId: string;   // Frontend se ye name match hona chahiye

    @IsOptional()
    @IsString()
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TransferItemDto)
    items: TransferItemDto[];
}