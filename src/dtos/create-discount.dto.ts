import { IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { DiscountType, DiscountScope } from "@prisma/client";

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsEnum(DiscountScope)
  scope: DiscountScope;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetIds: string[];

  // --- YE MISSING THA, ISAY ADD KAREIN ---
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number; 
  // --------------------------------------

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}