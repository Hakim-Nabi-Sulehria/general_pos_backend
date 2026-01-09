import { InventoryAdjustmentType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateInventoryAdjustmentDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    branchId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsEnum(InventoryAdjustmentType)
    type: InventoryAdjustmentType;

    @IsOptional()
    @IsString()
    reason?: string;

    // --- FIX: Ye field zaroori hai service error hatane ke liye ---
    @IsOptional()
    @IsString()
    referenceId?: string; 

    @IsOptional()
    @IsString()
    createdBy?: string;
}